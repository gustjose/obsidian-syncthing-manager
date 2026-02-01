import { Plugin, Notice, WorkspaceLeaf, TFile } from "obsidian";
import { SyncthingSettingTab } from "./ui/settings";
import { SyncthingAPI, SyncthingHistoryItem } from "./api/syncthing-api";
import { SyncthingEventMonitor } from "./services/event-monitor";
import { SyncthingView, VIEW_TYPE_SYNCTHING } from "./ui/view";
import { t, setLanguage } from "./lang/lang";
import { IgnoreManager } from "./services/ignore-manager";
import { TabManager } from "./services/tab-manager";
import { SettingsManager } from "./services/settings-manager";
import { StatusBarManager } from "./ui/status-bar-manager";
import { FileStateManager } from "./services/file-state-manager";
import { Logger, LOG_MODULES } from "./utils/logger";
import { createSyncthingIcon } from "./ui/icons";
import { SyncthingPluginSettings, SyncStatus, AppWithCommands } from "./types";

export default class SyncthingController extends Plugin {
	settings: SyncthingPluginSettings;
	settingsManager: SettingsManager;
	statusBarManager: StatusBarManager;
	fileStateManager: FileStateManager;

	ribbonIconEl: HTMLElement | null = null;
	monitor: SyncthingEventMonitor;
	history: SyncthingHistoryItem[] = [];
	myDeviceID: string = "";
	tabManager: TabManager;

	public lastSyncTime: string = "--:--";
	public connectedDevices: number = 0;
	public currentStatus: SyncStatus = "desconhecido";

	get apiUrl(): string {
		const protocol = this.settings.useHttps ? "https://" : "http://";
		const host = this.settings.syncthingHost
			.replace(/^https?:\/\//, "")
			.replace(/\/$/, "");
		return `${protocol}${host}:${this.settings.syncthingPort}`;
	}

	// --- Lifecycle ---

	async onload() {
		// 1. Carrega Configurações
		this.settingsManager = new SettingsManager(this);
		this.settings = await this.settingsManager.loadSettings();
		setLanguage(this.settings.language);

		// 2. Inicializa Gerenciadores
		this.tabManager = new TabManager(this.app, this);

		// Inicializa o Gerenciador de Estado Persistente
		// this.manifest.dir é o caminho da pasta do plugin
		this.fileStateManager = new FileStateManager(
			this.app,
			this.manifest.dir || "",
		);
		await this.fileStateManager.load();

		const ignoreManager = new IgnoreManager(this.app);
		await ignoreManager.ensureDefaults();

		// 3. Verifica ID do Dispositivo
		await this.fetchMyDeviceID();

		// 4. Registra Views
		this.registerView(
			VIEW_TYPE_SYNCTHING,
			(leaf) => new SyncthingView(leaf, this),
		);

		// 5. Interface - Barra de Status
		if (this.settings.showStatusBar) {
			this.statusBarManager = new StatusBarManager(this, () => {
				void this.forcarSincronizacao();
			});
			this.statusBarManager.init();
		}

		// 6. Interface - Ícone Lateral
		if (this.settings.showRibbonIcon) {
			this.ribbonIconEl = this.addRibbonIcon(
				"refresh-cw",
				t("ribbon_tooltip"),
				() => {
					void this.activateView();
				},
			);
		}

		// 7. Eventos de Modificação (Gatilho de Estado 'Pending')
		this.registerEvent(
			this.app.vault.on("modify", async (abstractFile) => {
				if (abstractFile instanceof TFile) {
					// 1. Persistência: Marca como 'sujo' no banco
					await this.fileStateManager.markAsDirty(abstractFile.path);
					// 2. Visual: Atualiza a aba imediatamente
					this.tabManager.setPendingSync(abstractFile);
				}
			}),
		);

		// 8. Comandos
		this.addCommand({
			id: "open-syncthing-view",
			name: t("cmd_open_panel"),
			callback: () => {
				void this.activateView();
			},
		});

		this.addCommand({
			id: "syncthing-force-scan",
			name: t("cmd_force_sync"),
			icon: "refresh-cw",
			callback: async () => {
				await this.forcarSincronizacao();
			},
		});

		this.addCommand({
			id: "test-syncthing-connection",
			name: t("cmd_debug_connect"),
			callback: async () => {
				await this.verificarConexao(true);
			},
		});

		// 9. Monitoramento
		this.monitor = new SyncthingEventMonitor(this);
		this.addSettingTab(new SyncthingSettingTab(this.app, this));

		// 10. Inicialização Final e Reconciliação
		this.atualizarTodosVisuais();
		await this.verificarConexao(false);
		await this.atualizarContagemDispositivos();

		// Verifica se arquivos pendentes foram sincronizados enquanto o plugin estava off
		await this.reconcileFileStates();

		void this.monitor.start();
	}

	onunload() {
		if (this.monitor) this.monitor.stop();
		if (this.statusBarManager) this.statusBarManager.destroy();
	}

	// --- Lógica de Reconciliação e Estado ---

	/**
	 * Verifica o estado real na API para todos os arquivos marcados como 'pending'
	 */
	async reconcileFileStates() {
		const pendingFiles = this.fileStateManager.getPendingFiles();
		if (pendingFiles.length === 0) return;

		Logger.debug(
			LOG_MODULES.MAIN,
			`Reconciliando ${pendingFiles.length} arquivos pendentes...`,
		);

		for (const fileState of pendingFiles) {
			const file = this.app.vault.getAbstractFileByPath(fileState.path);

			// Se o arquivo não existe mais, ignoramos (o GC limpará depois ou tratamos como deletado)
			if (!(file instanceof TFile)) continue;

			// Restaura o visual de "pendente" inicialmente
			this.tabManager.setPendingSync(file);

			// Se temos configuração válida, verificamos a API
			if (
				this.settings.syncthingApiKey &&
				this.settings.syncthingFolderId
			) {
				try {
					const info = await SyncthingAPI.getFileInfo(
						this.apiUrl,
						this.settings.syncthingApiKey,
						this.settings.syncthingFolderId,
						fileState.path,
					);

					// Comparação de Vetores de Versão
					// Se local.version == global.version, o arquivo está sincronizado no cluster
					const isSynced =
						JSON.stringify(info.local.version) ===
						JSON.stringify(info.global.version);

					if (isSynced) {
						Logger.debug(
							LOG_MODULES.MAIN,
							`Reconciliado: ${fileState.path} já estava sincronizado.`,
						);
						await this.onFileSyncedEvent(fileState.path);
					}
				} catch (e) {
					Logger.warn(
						LOG_MODULES.MAIN,
						`Falha ao reconciliar ${fileState.path} via API`,
						e,
					);
				}
			}
		}
	}

	/**
	 * Método central para registrar que um arquivo foi sincronizado.
	 * Deve ser chamado pelo EventMonitor.
	 */
	async onFileSyncedEvent(path: string) {
		// 1. Persistência: Marca como 'synced' no banco
		await this.fileStateManager.markAsSynced(path);
		// 2. Visual: Atualiza a aba para verde/check
		this.tabManager.setSynced(path);
	}

	// --- View Management ---

	async activateView() {
		const { workspace } = this.app;
		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_SYNCTHING);

		if (leaves.length > 0) {
			leaf = leaves[0];
		} else {
			leaf = workspace.getRightLeaf(false);
			if (leaf)
				await leaf.setViewState({
					type: VIEW_TYPE_SYNCTHING,
					active: true,
				});
		}
		if (leaf) await workspace.revealLeaf(leaf);
	}

	atualizarTodosVisuais() {
		if (this.statusBarManager && this.settings.showStatusBar) {
			this.statusBarManager.update(
				this.currentStatus,
				this.lastSyncTime,
				this.connectedDevices,
			);
		}

		if (this.ribbonIconEl) {
			this.ribbonIconEl.empty();
			const iconContainer = this.ribbonIconEl.createDiv({
				cls: "ribbon-icon-svg",
			});
			const svg = createSyncthingIcon("");
			iconContainer.appendChild(svg);

			const tooltipInfo = `${t("status_synced")}\n\n${t("info_last_sync")}: ${
				this.lastSyncTime
			}\n${t("info_devices")}: ${this.connectedDevices}`;

			this.ribbonIconEl.setAttribute("aria-label", tooltipInfo);
		}

		const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_SYNCTHING);
		leaves.forEach((leaf) => {
			if (leaf.view instanceof SyncthingView) leaf.view.updateView();
		});
	}

	async saveSettings() {
		await this.settingsManager.saveSettings(this.settings);
	}

	// --- Business Logic (API calls & Actions) ---

	async testarApiApenas() {
		try {
			new Notice("Ping...");
			const status = await SyncthingAPI.getStatus(
				this.apiUrl,
				this.settings.syncthingApiKey,
			);
			new Notice(
				`${t("notice_success_conn")} ${status.myID.substring(0, 5)}...`,
			);
		} catch (error) {
			Logger.error(LOG_MODULES.MAIN, "Falha no teste de API", error);
			new Notice(t("notice_fail_conn"));
		}
	}

	async atualizarContagemDispositivos() {
		try {
			const connections = await SyncthingAPI.getConnections(
				this.apiUrl,
				this.settings.syncthingApiKey,
			);
			const devices = connections.connections || {};
			const count = Object.values(devices).filter(
				(d: { connected: boolean }) => d.connected,
			).length;
			this.connectedDevices = count;
			this.atualizarTodosVisuais();
		} catch {
			// Fail silently
		}
	}

	async forcarSincronizacao() {
		Logger.debug(LOG_MODULES.MAIN, "Iniciando forcarSincronizacao");
		if (!this.settings.syncthingApiKey) {
			new Notice(t("notice_config_first"));
			return;
		}

		const app = this.app as unknown as AppWithCommands;
		if (app.commands) {
			app.commands.executeCommandById("editor:save-file");
		}

		new Notice(t("notice_syncing"));
		this.currentStatus = "sincronizando";
		this.atualizarTodosVisuais();

		try {
			await SyncthingAPI.forceScan(
				this.apiUrl,
				this.settings.syncthingApiKey,
				this.settings.syncthingFolderId,
			);
			await this.atualizarContagemDispositivos();
			await this.refreshHistory();
		} catch (error) {
			Logger.warn(LOG_MODULES.MAIN, "Erro ao forçar scan:", error);
			new Notice("Erro!");
			this.currentStatus = "erro";
			this.atualizarTodosVisuais();
		}
	}

	async verificarConexao(showNotice: boolean = false) {
		try {
			const systemStatus = await SyncthingAPI.getStatus(
				this.apiUrl,
				this.settings.syncthingApiKey,
			);

			if (this.settings.syncthingFolderId) {
				const folderStats = await SyncthingAPI.getFolderStats(
					this.apiUrl,
					this.settings.syncthingApiKey,
					this.settings.syncthingFolderId,
				);
				const state = folderStats.state;
				const needBytes = folderStats.needBytes;

				if (
					state === "scanning" ||
					state === "syncing" ||
					needBytes > 0
				) {
					this.currentStatus = "sincronizando";
					if (showNotice) new Notice(t("notice_syncing"));
				} else if (state === "idle" && needBytes === 0) {
					this.lastSyncTime = new Date().toLocaleTimeString([], {
						hour: "2-digit",
						minute: "2-digit",
					});
					this.currentStatus = "conectado";
					if (showNotice) new Notice(t("status_synced"));
				} else {
					this.currentStatus = "erro";
					if (showNotice) new Notice(`Status: ${state}`);
				}
			} else {
				this.currentStatus = "conectado";
				if (showNotice)
					new Notice(
						`${t(
							"notice_success_conn",
						)} ${systemStatus.myID.substring(0, 5)}...`,
					);
			}
			this.atualizarTodosVisuais();
		} catch (error) {
			if (error instanceof Error && error.message.includes("403")) {
				this.currentStatus = "erro";
				if (showNotice) new Notice(t("notice_error_auth"));
			} else {
				this.currentStatus = "desconectado";
				if (showNotice) new Notice(t("notice_offline"));
			}
			this.atualizarTodosVisuais();
		}
	}

	async fetchMyDeviceID() {
		try {
			const status = await SyncthingAPI.getStatus(
				this.apiUrl,
				this.settings.syncthingApiKey,
			);
			this.myDeviceID = status.myID;
		} catch (e) {
			Logger.error(LOG_MODULES.MAIN, "Erro ao buscar Device ID", e);
		}
	}

	async refreshHistory() {
		try {
			if (!this.settings.syncthingFolderId) {
				return;
			}

			const configFolder = this.app.vault.configDir;
			const defaultIgnores = `${configFolder}, .DS_Store, desktop.ini`;

			this.history = await SyncthingAPI.getHistory(
				this.apiUrl,
				this.settings.syncthingApiKey,
				this.settings.syncthingFolderId,
				this.settings.ignoredPaths || defaultIgnores,
				this.myDeviceID,
			);

			const leaves =
				this.app.workspace.getLeavesOfType(VIEW_TYPE_SYNCTHING);

			leaves.forEach((leaf) => {
				if (leaf.view instanceof SyncthingView) {
					leaf.view.updateView();
				}
			});
		} catch (error) {
			Logger.error(LOG_MODULES.MAIN, "Failed to fetch history", error);
		}
	}
}
