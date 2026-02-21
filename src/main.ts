import {
	Plugin,
	Notice,
	WorkspaceLeaf,
	TFile,
	FileSystemAdapter,
	Menu,
	MenuItem,
} from "obsidian";
import { SyncthingSettingTab } from "./ui/settings";
import { SyncthingAPI, SyncthingHistoryItem } from "./api/syncthing-api";
import { SyncthingEventMonitor } from "./services/event-monitor";
import { SyncthingView, VIEW_TYPE_SYNCTHING } from "./ui/view";
import { VersionModal } from "./ui/version-modal";
import { t, setLanguage } from "./lang/lang";
import { IgnoreManager } from "./services/ignore-manager";
import { TabManager } from "./services/tab-manager";
import { SettingsManager } from "./services/settings-manager";
import { StatusBarManager } from "./ui/status-bar-manager";
import { FileStateManager } from "./services/file-state-manager";
import { ExplorerManager } from "./services/explorer-manager";
import { Logger, LOG_MODULES } from "./utils/logger";
import { createSyncthingIcon } from "./ui/icons";
import { SyncthingPluginSettings, SyncStatus, AppWithCommands } from "./types";

export default class SyncthingController extends Plugin {
	settings: SyncthingPluginSettings;
	settingsManager: SettingsManager;
	statusBarManager: StatusBarManager;
	fileStateManager: FileStateManager;
	explorerManager: ExplorerManager; // [NOVO]

	ribbonIconEl: HTMLElement | null = null;
	monitor: SyncthingEventMonitor;
	history: SyncthingHistoryItem[] = [];
	myDeviceID: string = "";
	tabManager: TabManager;

	public pathPrefix: string = "";

	public lastSyncTime: string = "--:--";
	public connectedDevices: number = 0;
	public currentStatus: SyncStatus = "desconhecido";
	public isPaused: boolean = false;
	public deviceMap: Map<string, string> = new Map();
	public connectedDeviceNames: string[] = [];

	get apiUrl(): string {
		const protocol = this.settings.useHttps ? "https://" : "http://";
		const host = this.settings.syncthingHost
			.replace(/^https?:\/\//, "")
			.replace(/\/$/, "");
		return `${protocol}${host}:${this.settings.syncthingPort}`;
	}

	// --- Lifecycle ---

	async onload() {
		this.settingsManager = new SettingsManager(this);
		this.settings = await this.settingsManager.loadSettings();
		setLanguage(this.settings.language);

		// Initialize Logger Debug Mode
		Logger.setDebugMode(this.settings.debugMode);
		Logger.setActiveModules(this.settings.debugModules);

		this.tabManager = new TabManager(this.app, this);

		this.fileStateManager = new FileStateManager(
			this.app,
			this.manifest.dir || "",
		);
		await this.fileStateManager.load();

		const ignoreManager = new IgnoreManager(this.app, this);

		await this.fetchMyDeviceID();

		this.registerView(
			VIEW_TYPE_SYNCTHING,
			(leaf) => new SyncthingView(leaf, this),
		);

		if (this.settings.showStatusBar) {
			this.statusBarManager = new StatusBarManager(this, () => {
				void this.forcarSincronizacao();
			});
			this.statusBarManager.init();
		}

		if (this.settings.showRibbonIcon) {
			this.ribbonIconEl = this.addRibbonIcon(
				"refresh-cw",
				t("ribbon_tooltip"),
				() => {
					void this.activateView();
				},
			);
		}

		// [NOVO] Inicializa o gerenciador de botões do explorador
		this.explorerManager = new ExplorerManager(this.app, this);
		this.explorerManager.onload();

		this.registerEvent(
			this.app.vault.on("modify", (abstractFile) => {
				if (abstractFile instanceof TFile) {
					// Ignora arquivos temporários criados pelo próprio Syncthing
					if (abstractFile.name.includes("~syncthing~")) return;

					this.fileStateManager.markAsDirty(abstractFile.path);
					this.tabManager.setPendingSync(abstractFile);
				}
			}),
		);

		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, file) => {
				if (file instanceof TFile) {
					// FEATURE: Context Menu Configuration
					// Only show if enabled in settings
					// Context Menu Items
					const enabledItems = this.settings.enabledContextMenuItems;
					const shouldGroup = this.settings.groupContextMenuItems;

					// Define available items with their logic
					const availableItems: Record<
						string,
						{
							title: string;
							icon: string;
							action: () => void | Promise<void>;
						}
					> = {
						view_file_versions: {
							title: t("cmd_view_versions") || "File versions",
							icon: "history",
							action: () => {
								new VersionModal(
									this.app,
									this,
									file.path,
								).open();
							},
						},
						sync_file: {
							title: t("cmd_sync_file") || "Sync file",
							icon: "refresh-cw",
							action: async () => {
								await this.syncSpecificFile(file.path);
							},
						},
					};

					if (shouldGroup) {
						// Create a parent item
						menu.addItem((item) => {
							item.setTitle("Syncthing")
								.setIcon("refresh-cw") // Use a standard icon for now
								.setSection("syncthing");

							// Create submenu
							const itemWithSubmenu = item as MenuItem & {
								setSubmenu: () => Menu;
							};

							if (
								typeof itemWithSubmenu.setSubmenu === "function"
							) {
								const submenu = itemWithSubmenu.setSubmenu();

								enabledItems.forEach((id) => {
									const def = availableItems[id];
									if (def) {
										submenu.addItem((subItem) => {
											subItem
												.setTitle(def.title)
												.setIcon(def.icon)
												.onClick(def.action);
										});
									}
								});
							}
						});
					} else {
						// Add items directly to root menu
						enabledItems.forEach((id) => {
							const def = availableItems[id];
							if (def) {
								menu.addItem((item) => {
									item.setTitle(def.title)
										.setIcon(def.icon)
										.onClick(def.action);
								});
							}
						});
					}
				}
			}),
		);

		this.addCommand({
			id: "view-file-versions",
			name: t("cmd_view_versions"),
			checkCallback: (checking: boolean) => {
				const file = this.app.workspace.getActiveFile();
				if (file) {
					if (!checking) {
						new VersionModal(this.app, this, file.path).open();
					}
					return true;
				}
				return false;
			},
		});

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

		this.monitor = new SyncthingEventMonitor(this);
		this.addSettingTab(new SyncthingSettingTab(this.app, this));

		this.atualizarTodosVisuais();

		this.app.workspace.onLayoutReady(async () => {
			const conexaoValida = await this.verificarConexao(false);

			// Só prosseguimos carregando dados e históricos se a conexão existir E a
			// pasta configurada for confirmadamente válida no servidor.
			if (conexaoValida) {
				await this.detectPathPrefix();
				await ignoreManager.ensureDefaults();
				await this.atualizarContagemDispositivos();
				await this.reconcileFileStates();
				void this.monitor.start();
			} else {
				// Carrega interface visual e contador zerado apenas para informar offline/erro
				await this.atualizarContagemDispositivos();
			}
		});
	}

	onunload() {
		if (this.monitor) this.monitor.stop();
		if (this.statusBarManager) this.statusBarManager.destroy();
		if (this.explorerManager) this.explorerManager.onunload();
	}

	// --- Lógica de Prefixo ---

	async detectPathPrefix() {
		if (!this.settings.syncthingApiKey || !this.settings.syncthingFolderId)
			return;

		try {
			const folders = await SyncthingAPI.getFolders(
				this.apiUrl,
				this.settings.syncthingApiKey,
			);
			const currentSyncFolder = folders.find(
				(f) => f.id === this.settings.syncthingFolderId,
			);

			if (!currentSyncFolder) return;

			const adapter = this.app.vault.adapter;
			if (adapter instanceof FileSystemAdapter) {
				const vaultPath = adapter.getBasePath().replace(/\\/g, "/");
				const syncPath = currentSyncFolder.path
					.replace(/\\/g, "/")
					.replace(/\/$/, "");

				if (vaultPath.startsWith(syncPath) && vaultPath !== syncPath) {
					let relative = vaultPath.substring(syncPath.length);
					if (relative.startsWith("/"))
						relative = relative.substring(1);
					if (relative && !relative.endsWith("/")) relative += "/";

					this.pathPrefix = relative;
					Logger.debug(
						LOG_MODULES.MAIN,
						`Prefixo detectado: "${this.pathPrefix}"`,
					);
				} else {
					this.pathPrefix = "";
				}
			}
		} catch (e) {
			Logger.warn(
				LOG_MODULES.MAIN,
				"Falha ao detectar prefixo de pasta",
				e,
			);
		}
	}

	// --- Lógica de Reconciliação e Ações de Arquivo ---

	/**
	 * Função pública para sincronizar um arquivo específico.
	 * [CORREÇÃO] Agora força o SCAN primeiro, para garantir que edições locais sejam captadas.
	 */
	async syncSpecificFile(obsidianPath: string) {
		if (!this.settings.syncthingApiKey || !this.settings.syncthingFolderId)
			return;

		const fullPath = this.pathPrefix + obsidianPath;

		Logger.debug(
			LOG_MODULES.MAIN,
			`[SyncFile] Iniciando sincronização pontual para: ${fullPath}`,
		);

		try {
			// 1. PASSO CRUCIAL: Força o Syncthing a ler o arquivo do disco (Scan)
			// Isso detecta as mudanças locais imediatamente.
			await SyncthingAPI.forceScan(
				this.apiUrl,
				this.settings.syncthingApiKey,
				this.settings.syncthingFolderId,
				fullPath,
			);

			// 2. Aguarda um momento para o Syncthing processar o hash do arquivo
			await new Promise((resolve) => setTimeout(resolve, 1500));

			// 3. Loop de Verificação (Polling)
			// Verifica se o estado convergiu (Local == Global)
			let success = false;
			for (let i = 1; i <= 3; i++) {
				try {
					await this.checkFileStatus(obsidianPath);
					// Se checkFileStatus não der erro e encontrar sincronia, ele chama onFileSyncedEvent internamente
					// Porém, se o arquivo estiver UPLOAD (Local > Global), checkFileStatus não fará nada.

					// Aqui apenas confirmamos que a API respondeu
					success = true;
					break;
				} catch (e) {
					Logger.warn(LOG_MODULES.MAIN, `Erro: ${e}`);
					await new Promise((resolve) => setTimeout(resolve, 1000));
				}
			}

			if (!success) {
				Logger.warn(
					LOG_MODULES.MAIN,
					`[SyncFile] Não foi possível confirmar o status final de ${fullPath}`,
				);
			}
		} catch (error) {
			Logger.error(
				LOG_MODULES.MAIN,
				`[SyncFile] Erro ao solicitar scan para ${fullPath}`,
				error,
			);
			throw error; // Repassa o erro para o botão ficar vermelho/parar animação
		}
	}

	/**
	 * Verifica o estado de todos os arquivos pendentes.
	 * Agora reutiliza a lógica robusta de syncSpecificFile.
	 */
	async reconcileFileStates() {
		const pendingFiles = this.fileStateManager.getPendingFiles();
		if (pendingFiles.length === 0) return;

		Logger.debug(
			LOG_MODULES.MAIN,
			`Reconciliando ${pendingFiles.length} arquivos pendentes...`,
		);

		// Passo 1: Aplica rapidamente a indicação visual a todos os arquivos listados.
		for (const fileState of pendingFiles) {
			const file = this.app.vault.getAbstractFileByPath(fileState.path);
			if (file instanceof TFile) {
				this.tabManager.setPendingSync(file);
			}
		}

		// Passo 2: Executa as operações de API e checagem de sincronização (bloqueante)
		for (const fileState of pendingFiles) {
			try {
				await this.syncSpecificFile(fileState.path);
			} catch (e) {
				Logger.warn(
					LOG_MODULES.MAIN,
					`Falha ao tentar reconciliar estado pendente do arquivo ${fileState.path}`,
					e,
				);
			}
		}
	}

	private async checkFileStatus(obsidianPath: string) {
		const fullPath = this.pathPrefix + obsidianPath;

		const info = await SyncthingAPI.getFileInfo(
			this.apiUrl,
			this.settings.syncthingApiKey,
			this.settings.syncthingFolderId,
			fullPath,
		);

		const localVer = info.local?.version || [];
		const globalVer = info.global?.version || [];

		localVer.sort();
		globalVer.sort();

		const isSynced = JSON.stringify(localVer) === JSON.stringify(globalVer);

		if (isSynced) {
			this.onFileSyncedEvent(obsidianPath);
		}
	}

	onFileSyncedEvent(path: string) {
		this.fileStateManager.markAsSynced(path);
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

			const tooltipInfo = `${t("status_synced")}\n\n${t(
				"info_last_sync",
			)}: ${this.lastSyncTime}\n${t("info_devices")}: ${
				this.connectedDevices
			}`;

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

	async fetchDeviceMap() {
		try {
			const devices = await SyncthingAPI.getDevices(
				this.apiUrl,
				this.settings.syncthingApiKey,
			);
			this.deviceMap.clear();
			devices.forEach((device) => {
				// Use label/name if available, otherwise fallback to ID
				const name = device.name || device.deviceID.substring(0, 7);
				this.deviceMap.set(device.deviceID, name);
			});
		} catch (e) {
			Logger.error(
				LOG_MODULES.MAIN,
				"Erro ao buscar mapa de dispositivos",
				e,
			);
		}
	}

	async atualizarContagemDispositivos() {
		try {
			// Ensure map is populated/updated
			if (this.deviceMap.size === 0) {
				await this.fetchDeviceMap();
			}

			const connections = await SyncthingAPI.getConnections(
				this.apiUrl,
				this.settings.syncthingApiKey,
			);
			const devices = connections.connections || {};
			const connectedIDs = Object.keys(devices).filter(
				(id) => devices[id].connected,
			);

			this.connectedDevices = connectedIDs.length;
			this.connectedDeviceNames = connectedIDs.map((id) => {
				return this.deviceMap.get(id) || id.substring(0, 7);
			});

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

		// Valida se a pasta ainda existe no servidor. Mostra os erros (true).
		const isConexaoValida = await this.verificarConexao(true);

		if (!isConexaoValida || !this.settings.syncthingFolderId) {
			// Não continua se o servidor estiver offline, se a api key for invalida
			// ou se a pasta não existir mais (verificarConexao limpa o FolderId nesse caso).
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

	async checkPauseStatus() {
		if (!this.settings.syncthingFolderId || !this.settings.syncthingApiKey)
			return;

		try {
			const folders = await SyncthingAPI.getFolders(
				this.apiUrl,
				this.settings.syncthingApiKey,
			);
			const currentFolder = folders.find(
				(f) => f.id === this.settings.syncthingFolderId,
			);
			if (currentFolder) {
				this.isPaused = !!currentFolder.paused;
				// Update status if paused
				if (this.isPaused) {
					this.currentStatus = "pausado";
				}
			}
		} catch (e) {
			if (e && typeof e === "object" && "message" in e) {
				const msg = (e as Error).message;
				if (msg.includes("403") || msg.includes("Failed to fetch"))
					return;
			}
			Logger.error(
				LOG_MODULES.MAIN,
				"Erro ao verificar status de pausa",
				e,
			);
		}
	}

	async togglePause() {
		if (
			!this.settings.syncthingFolderId ||
			!this.settings.syncthingApiKey
		) {
			new Notice(t("notice_config_first"));
			return;
		}

		try {
			// Update status first to be sure
			await this.checkPauseStatus();

			if (this.isPaused) {
				await SyncthingAPI.resumeFolder(
					this.apiUrl,
					this.settings.syncthingApiKey,
					this.settings.syncthingFolderId,
				);
				new Notice("Resuming sync...");
				this.isPaused = false;
				// Force check connection to update status from 'pausado' to 'conectado'/'syncing'
				await this.verificarConexao(false);
			} else {
				await SyncthingAPI.pauseFolder(
					this.apiUrl,
					this.settings.syncthingApiKey,
					this.settings.syncthingFolderId,
				);
				new Notice("Pausing sync...");
				this.isPaused = true;
				this.currentStatus = "pausado";
			}
			this.atualizarTodosVisuais();
		} catch (error) {
			Logger.error(LOG_MODULES.MAIN, "Erro ao alternar pausa", error);
			new Notice(t("status_error"));
		}
	}

	async verificarConexao(showNotice: boolean = false): Promise<boolean> {
		try {
			if (this.settings.syncthingFolderId) {
				// Validação prévia de existência da pasta na API (evita falhas massivas 404 e 500 no background)
				const isFolderValid = await SyncthingAPI.isFolderValid(
					this.apiUrl,
					this.settings.syncthingApiKey,
					this.settings.syncthingFolderId,
				);

				if (!isFolderValid) {
					this.currentStatus = "erro";
					new Notice(t("notice_folder_missing"));
					// Limpa a configuração falha imediatamente para não insistir no erro
					this.settings.syncthingFolderId = "";
					this.settings.syncthingFolderLabel = "";
					await this.saveSettings();

					// Finalizamos aqui o verificarConexao para não propagar erros
					this.atualizarTodosVisuais();
					return false;
				}

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
				// Cenário onde não há pasta configurada (ou ela acabou de ser limpa por erro)
				if (showNotice) {
					new Notice(t("notice_config_first"));
				}
				// Para evitar que a tela de status do histórico diga falsamente "Sincronizado/Conectado" quando tudo está vazio,
				// retornamos "configurando" que assume uma UI mais precisa (Cinza - Settings).
				this.currentStatus = "configurando";
			}
			await this.checkPauseStatus(); // checkPauseStatus sets 'pausado' if true, overwriting 'conectado' or others if needed.

			this.atualizarTodosVisuais();
			// Retornamos sucesso APENAS se houver pasta ativa. Se a pasta for falsa/limpa, é um "false" operacional para o resto.
			return (
				this.currentStatus !== "erro" &&
				!!this.settings.syncthingFolderId
			);
		} catch (error) {
			if (error instanceof Error && error.message.includes("403")) {
				this.currentStatus = "erro";
				if (showNotice) new Notice(t("notice_error_auth"));
			} else {
				this.currentStatus = "desconectado";
				if (showNotice) new Notice(t("notice_offline"));
			}
			this.atualizarTodosVisuais();
			return false;
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
