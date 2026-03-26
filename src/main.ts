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
import { DebugReportModal } from "./ui/debug-report-modal";
import { SecretManager } from "./services/secret-manager";
import { getStatusDisplay } from "./ui/status-utils";
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
	secretManager: SecretManager;
	public ignoreManager: IgnoreManager | null = null;

	public pathPrefix: string = "";

	public lastSyncTime: string = "--:--";
	public connectedDevices: number = 0;
	public currentStatus: SyncStatus = "desconhecido";
	public isPaused: boolean = false;
	public deviceMap: Map<string, string> = new Map();
	public connectedDeviceNames: string[] = [];
	public remotePausedDevice: string | null = null;

	get apiUrl(): string {
		const protocol = this.settings.useHttps ? "https://" : "http://";
		const host = this.settings.syncthingHost
			.replace(/^https?:\/\//, "")
			.replace(/\/$/, "");
		return `${protocol}${host}:${this.settings.syncthingPort}`;
	}

	// --- Lifecycle ---

	async onload() {
		this.secretManager = new SecretManager(this.app);
		this.settingsManager = new SettingsManager(this, this.secretManager);
		this.settings = await this.settingsManager.loadSettings();
		setLanguage(this.settings.language);

		// Initialize Logger Debug Mode
		Logger.setDebugMode(this.settings.debugMode);
		Logger.setActiveModules(this.settings.debugModules);
		Logger.setLogLevel(this.settings.logLevel);

		this.tabManager = new TabManager(this.app, this);

		this.fileStateManager = new FileStateManager(
			this.app,
			this.manifest.dir || "",
		);
		await this.fileStateManager.load();

		// Restaurar estado global salvo
		const savedEntry = this.fileStateManager.getGlobalState();
		if (savedEntry) {
			if (savedEntry.status) this.currentStatus = savedEntry.status;
			if (savedEntry.lastSyncTime)
				this.lastSyncTime = savedEntry.lastSyncTime;
			if (savedEntry.connectedDevices !== undefined)
				this.connectedDevices = savedEntry.connectedDevices;
			
			// Notifica a UI sobre o estado restaurado (com um pequeno delay para garantir que a UI esteja pronta)
			setTimeout(() => {
				this.app.workspace.trigger("syncthing:status-changed");
			}, 100);
		}

		const ignoreManager = new IgnoreManager(this.app, this);

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

			// Atualiza o ribbon icon passivamente quando o status mudar
			this.registerEvent(
				this.app.workspace.on("syncthing:status-changed", () => {
					if (this.ribbonIconEl) {
						this.ribbonIconEl.empty();
						const iconContainer = this.ribbonIconEl.createDiv({
							cls: "ribbon-icon-svg",
						});

						const svg = createSyncthingIcon("");
						iconContainer.appendChild(svg);

						const statusText = getStatusDisplay(
							this.currentStatus,
							this.remotePausedDevice,
						).text;

						const tooltipInfo = `${statusText}\n\n${t(
							"info_last_sync",
						)}: ${this.lastSyncTime}\n${t("info_devices")}: ${
							this.connectedDevices
						}`;
						this.ribbonIconEl.setAttribute(
							"aria-label",
							tooltipInfo,
						);
					}
				}),
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
				const isFile = file instanceof TFile;
				const isFolder = !isFile;

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
						show: boolean;
						disabled?: boolean;
						action: () => void | Promise<void>;
					}
				> = {
					view_file_versions: {
						title: t("cmd_view_versions") || "File versions",
						icon: "history",
						show: isFile,
						action: () => {
							new VersionModal(this.app, this, file.path).open();
						},
					},
					sync_file: {
						title: t("cmd_sync_file") || "Sync file",
						icon: "refresh-cw",
						show: isFile,
						action: async () => {
							await this.syncSpecificFile(file.path);
						},
					},
					ignore_file: {
						title: t("cmd_ignore_file") || "Don't sync this",
						icon: "eye-off",
						show: true, // Show for both files and folders
						disabled: this.ignoreManager
							? this.ignoreManager.isIgnored(file.path)
							: false,
						action: async () => {
							if (!this.ignoreManager) return;

							const success =
								await this.ignoreManager.addIgnoreRule(
									file.path,
									isFolder,
								);
							if (success) {
								new Notice(t("notice_ignored_success"));
							} else {
								new Notice(t("notice_ignored_error"));
							}
						},
					},
				};

				if (shouldGroup) {
					// Create a parent item
					// Mostrar o grupo apenas se existir ao menos um item ativado visível para o contexto (isFile ou isFolder)
					const hasVisibleItem = Object.keys(availableItems).some(
						(id) =>
							enabledItems.includes(id) &&
							availableItems[id] &&
							availableItems[id].show,
					);

					if (hasVisibleItem) {
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

								Object.keys(availableItems).forEach((id) => {
									if (enabledItems.includes(id)) {
										const def = availableItems[id];
										if (def && def.show) {
											submenu.addItem((subItem) => {
												subItem
													.setTitle(def.title)
													.setIcon(def.icon)
													.setDisabled(
														def.disabled || false,
													)
													.onClick(def.action);
											});
										}
									}
								});
							}
						});
					}
				} else {
					// Add items directly to root menu
					Object.keys(availableItems).forEach((id) => {
						// Double Check the strictly tracked string array
						if (enabledItems.includes(id)) {
							const def = availableItems[id];
							if (def && def.show) {
								menu.addItem((item) => {
									item.setTitle(def.title)
										.setIcon(def.icon)
										.setDisabled(def.disabled || false)
										.onClick(def.action);
								});
							}
						}
					});
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

		this.addCommand({
			id: "copy-debug-info",
			name: t("cmd_copy_debug"),
			callback: () => {
				new DebugReportModal(this.app, this).open();
			},
		});

		this.monitor = new SyncthingEventMonitor(this);
		this.addSettingTab(new SyncthingSettingTab(this.app, this));

		this.app.workspace.trigger("syncthing:status-changed");

		this.app.workspace.onLayoutReady(async () => {
			await this.initializeConnection(ignoreManager);
		});
	}

	async initializeConnection(
		ignoreManager?: IgnoreManager,
		showNotice: boolean = false,
		skipIdleStatusUpdate: boolean = false,
	): Promise<boolean> {
		// Salva referência para reconexões futuras
		if (ignoreManager) {
			this.ignoreManager = ignoreManager;
		}

		// Primeiro, atualiza a contagem de dispositivos
		await this.atualizarContagemDispositivos();

		const conexaoValida = await this.verificarConexao(
			showNotice,
			skipIdleStatusUpdate,
		);

		if (conexaoValida) {
			await this.fetchMyDeviceID();
			await this.detectPathPrefix();
			if (this.ignoreManager) {
				await this.ignoreManager.ensureDefaults();
			}
			await this.checkPauseStatus();
			await this.reconcileFileStates();

			// Reinicia o monitor se ele não estiver rodando
			if (!this.monitor.running) {
				void this.monitor.start();
			}
		} else {
			// Carrega interface visual e contador zerado
			await this.atualizarContagemDispositivos();
		}

		return conexaoValida;
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

		if (!info) {
			// Se retornar null, o Syncthing ainda não conhece o arquivo (retornou 404).
			// Retornamos quietamente, deixando o arquivo marcado como pendente até que
			// o EventMonitor notifique sua efetivação.
			return;
		}

		const localVer = info.local?.version || [];
		const globalVer = info.global?.version || [];

		const sortedLocal = [...localVer].sort();
		const sortedGlobal = [...globalVer].sort();

		const isSynced =
			sortedLocal.length === sortedGlobal.length &&
			sortedLocal.every((v, i) => sortedGlobal[i] === v);

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

	// Eventos e UI delegam via Event Bus
	// atualizarTodosVisuais() removido.

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

			this.saveGlobalState();
			this.app.workspace.trigger("syncthing:status-changed");
		} catch (e) {
			Logger.debug(
				LOG_MODULES.MAIN,
				"Falha ao atualizar contagem de dispositivos",
				e,
			);
		}
	}

	async forcarSincronizacao() {
		Logger.debug(LOG_MODULES.MAIN, "Iniciando forcarSincronizacao");
		if (!this.settings.syncthingApiKey) {
			new Notice(t("notice_config_first"));
			return;
		}

		new Notice(t("notice_syncing"));
		this.updateStatus("sincronizando");

		const isConexaoValida = await this.initializeConnection(
			this.ignoreManager || undefined,
			false,
			true,
		);

		if (!isConexaoValida || !this.settings.syncthingFolderId) {
			return;
		}

		if (this.isPaused) {
			new Notice(t("notice_is_paused") || "Sync is Paused");
			return;
		}

		const app = this.app as unknown as AppWithCommands;
		if (app.commands) {
			app.commands.executeCommandById("editor:save-file");
		}

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
			this.updateStatus("erro");
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
				if (this.isPaused) {
					this.updateStatus("pausado");
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
			await this.checkPauseStatus();

			if (this.isPaused) {
				await SyncthingAPI.resumeFolder(
					this.apiUrl,
					this.settings.syncthingApiKey,
					this.settings.syncthingFolderId,
				);
				new Notice("Resuming sync...");
				this.isPaused = false;
				await this.verificarConexao(false);
			} else {
				await SyncthingAPI.pauseFolder(
					this.apiUrl,
					this.settings.syncthingApiKey,
					this.settings.syncthingFolderId,
				);
				new Notice("Pausing sync...");
				this.isPaused = true;
				this.updateStatus("pausado");
			}
			this.app.workspace.trigger("syncthing:status-changed");
		} catch (error) {
			Logger.error(LOG_MODULES.MAIN, "Erro ao alternar pausa", error);
			new Notice(t("status_error"));
		}
	}

	async verificarConexao(
		showNotice: boolean = false,
		skipIdleStatusUpdate: boolean = false,
	): Promise<boolean> {
		try {
			if (!this.app || !this.app.workspace) return false;
			if (this.settings.syncthingFolderId === "device-specific") {
				this.settings.syncthingFolderId = "";
				this.settings.syncthingFolderLabel = "";
				await this.saveSettings();
				this.updateStatus("configurando");
				new Notice(t("notice_folder_migration"));
				return false;
			}

			if (this.settings.syncthingFolderId) {
				const isFolderValid = await SyncthingAPI.isFolderValid(
					this.apiUrl,
					this.settings.syncthingApiKey,
					this.settings.syncthingFolderId,
				);

				if (!isFolderValid) {
					this.updateStatus("erro");
					if (showNotice) {
						new Notice(t("notice_folder_missing"));
					}
					Logger.warn(
						LOG_MODULES.MAIN,
						`Pasta "${this.settings.syncthingFolderId}" não encontrada no servidor. Config mantida para retry.`,
					);
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
					if (!skipIdleStatusUpdate) {
						this.updateStatus("sincronizando");
						if (showNotice) new Notice(t("notice_syncing"));
					}
				} else if (state === "idle" && needBytes === 0) {
					this.lastSyncTime = new Date().toLocaleTimeString([], {
						hour: "2-digit",
						minute: "2-digit",
					});

					if (!skipIdleStatusUpdate) {
						if (this.connectedDevices === 0) {
							this.updateStatus("aguardando-dispositivos");
						} else {
							this.updateStatus("conectado");
						}
					}
				} else {
					this.updateStatus("erro");
					if (showNotice) new Notice(`Status: ${state}`);
				}
			} else {
				if (showNotice) {
					new Notice(t("notice_config_first"));
				}
				this.currentStatus = "configurando";
			}
			await this.checkPauseStatus();

			this.app.workspace.trigger("syncthing:status-changed");
			return (
				this.currentStatus !== "erro" &&
				!!this.settings.syncthingFolderId
			);
		} catch (error) {
			if (error instanceof Error && error.message.includes("403")) {
				this.updateStatus("erro");
				if (showNotice) new Notice(t("notice_error_auth"));
			} else {
				this.updateStatus("desconectado");
				if (showNotice) new Notice(t("notice_offline"));
			}
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
			Logger.error(LOG_MODULES.MAIN, "Failed to Fetch History", error);
		}
	}

	/**
	 * Atualiza o status e persiste o estado global
	 */
	updateStatus(status: SyncStatus) {
		this.currentStatus = status;
		this.saveGlobalState();
		this.app.workspace.trigger("syncthing:status-changed", status);
	}

	/**
	 * Salva o estado atual no gerenciador de arquivos
	 */
	saveGlobalState() {
		if (this.fileStateManager) {
			this.fileStateManager.setGlobalState(
				this.currentStatus,
				this.lastSyncTime,
				this.connectedDevices,
			);
		}
	}
}
