import { requestUrl, RequestUrlParam } from "obsidian";
import SyncthingController from "../main";
import { Logger, LOG_MODULES } from "../utils/logger";
import { SyncStatus } from "../types";

interface SyncthingEvent {
	id: number;
	type: string;
	data: unknown;
}

interface FolderCompletionData {
	folder: string;
	completion: number;
	needBytes: number;
}

interface StateChangedData {
	folder: string;
	to: string;
}

interface FolderSummaryData {
	folder: string;
	summary: {
		needBytes: number;
	};
}

interface ItemFinishedData {
	folder: string;
	item: string;
	action: string;
}

interface LocalIndexUpdatedData {
	folder: string;
	items?: string[];
	filenames?: string[]; // Syncthing v1.2+ usa filenames
}

export class SyncthingEventMonitor {
	plugin: SyncthingController;
	running: boolean = false;
	lastEventId: number = 0;
	private abortController: AbortController | null = null;

	// Estado interno para garantir que a UI só fique verde (idle) se a sincronização física (100%) também atestar.
	private lastKnownState: string = "idle";
	private lastKnownCompletion: number = 100;

	public get currentCompletion(): number {
		return this.lastKnownCompletion;
	}

	// Timer para certificar que o "idle" não é falso-positivo
	private idleGraceTimer: ReturnType<typeof setTimeout> | null = null;

	constructor(plugin: SyncthingController) {
		this.plugin = plugin;
	}

	async start(): Promise<void> {
		if (this.running) return;

		Logger.debug(LOG_MODULES.EVENT, "Iniciando monitor de eventos...");

		try {
			const url = `${this.plugin.apiUrl}/rest/events?limit=1`;
			const response = await requestUrl({
				url: url,
				method: "GET",
				headers: { "X-API-Key": this.plugin.settings.syncthingApiKey },
			});

			if (
				response.status === 200 &&
				Array.isArray(response.json) &&
				response.json.length > 0
			) {
				const events = response.json as unknown[];
				const lastEvent = events[events.length - 1] as SyncthingEvent;
				this.lastEventId = lastEvent.id;
				Logger.debug(
					LOG_MODULES.EVENT,
					`ID do último evento capturado: ${this.lastEventId}`,
				);
			}
		} catch (e) {
			Logger.error(
				LOG_MODULES.EVENT,
				"Erro ao buscar ID inicial de eventos",
				e,
			);
		}

		this.running = true;
		void this.loop();
	}

	stop(): void {
		this.running = false;
		if (this.abortController) {
			this.abortController.abort();
			this.abortController = null;
		}
		Logger.debug(LOG_MODULES.EVENT, "Monitor de eventos parado.");
	}

	private async loop(): Promise<void> {
		while (this.running) {
			try {
				if (!this.plugin.settings.syncthingApiKey) {
					await this.sleep(5000);
					continue;
				}

				const url = `${this.plugin.apiUrl}/rest/events?since=${this.lastEventId}&timeout=60`;

				this.abortController = new AbortController();

				// Timeout de Segurança (90s). O Syncthing usa 60s por padrão no Long-Polling.
				const timeoutId = setTimeout(() => {
					if (this.abortController) {
						Logger.debug(
							LOG_MODULES.EVENT,
							"EventMonitor Timeout atingido (90s). Abortando requisição zumbi.",
						);
						this.abortController.abort();
					}
				}, 90000);

				// Nota: A API requestUrl do Obsidian web usa fetch subjacente. Passar o signal é suportado nativamente.
				const requestOpts = {
					url: url,
					method: "GET",
					headers: {
						"X-API-Key": this.plugin.settings.syncthingApiKey,
					},
				} as RequestUrlParam & { signal?: AbortSignal };

				if (
					typeof AbortSignal !== "undefined" &&
					this.abortController
				) {
					requestOpts.signal = this.abortController.signal;
				}

				const response = await requestUrl(requestOpts);
				clearTimeout(timeoutId);

				if (response.status === 200) {
					// Cast seguro para unknown[] primeiro
					const events = response.json as unknown;
					if (Array.isArray(events) && events.length > 0) {
						for (const event of events) {
							// Validação básica de forma
							if (
								typeof event === "object" &&
								event !== null &&
								"id" in event
							) {
								const typedEvent = event as SyncthingEvent;
								this.lastEventId = typedEvent.id;
								this.processEvent(typedEvent);
							}
						}
					}
				}
			} catch (error) {
				Logger.debug(
					LOG_MODULES.EVENT,
					"Loop tick error (timeout?)",
					error,
				);

				const msg = String(error).toLowerCase();
				if (!msg.includes("timeout")) {
					this.lastEventId = 0;
					if (this.running) await this.sleep(5000);
				} else {
					if (this.running) await this.sleep(2000);
				}
			}
		}
	}

	/**
	 * Helper para atualizar o status no plugin principal,
	 * já que o método 'atualizarStatusBar' foi removido do main.ts na refatoração.
	 */
	private updateStatus(status: SyncStatus) {
		// Só atualiza se o status mudou para evitar repinturas desnecessárias
		if (this.plugin.currentStatus !== status) {
			this.plugin.currentStatus = status;
			// Se ficou ocioso/conectado, atualiza o horário
			if (status === "conectado") {
				this.plugin.lastSyncTime = new Date().toLocaleTimeString([], {
					hour: "2-digit",
					minute: "2-digit",
				});
			}
			this.plugin.app.workspace.trigger("syncthing:status-changed");
		}
	}

	public destroy() {}

	private processEvent(event: SyncthingEvent) {
		const targetFolder = this.plugin.settings.syncthingFolderId;
		if (!targetFolder) return;

		// 1. Conexão de Dispositivos
		if (
			event.type === "DeviceConnected" ||
			event.type === "DeviceDisconnected"
		) {
			Logger.debug(LOG_MODULES.EVENT, `[Event] ${event.type}`);
			void this.plugin.atualizarContagemDispositivos();
			return;
		}

		// Validação de segurança para 'data'
		if (typeof event.data !== "object" || event.data === null) return;

		// 2. Progresso da Pasta (FolderCompletion)
		if (event.type === "FolderCompletion") {
			const data = event.data as FolderCompletionData;
			if ("folder" in data && data.folder === targetFolder) {
				this.lastKnownCompletion = data.completion;
				Logger.debug(
					LOG_MODULES.EVENT,
					`[Event] FolderCompletion → ${data.completion}% (need: ${data.needBytes}B)`,
				);
				this.evaluateCombinedState();
			}
		}

		// 3. Mudança de Estado (StateChanged)
		if (event.type === "StateChanged") {
			const data = event.data as StateChangedData;
			if ("folder" in data && data.folder === targetFolder) {
				this.lastKnownState = data.to;
				Logger.debug(
					LOG_MODULES.EVENT,
					`[Event] StateChanged → ${data.to}`,
				);

				if (
					data.to === "scanning" ||
					data.to === "syncing" ||
					data.to === "scan-waiting"
				) {
					if (this.lastKnownCompletion === 100) {
						this.lastKnownCompletion = 99;
					}
				}

				this.evaluateCombinedState();
			}
		}

		// 4. Resumo da Pasta (FolderSummary)
		if (event.type === "FolderSummary") {
			const data = event.data as FolderSummaryData;
			if ("folder" in data && data.folder === targetFolder) {
				Logger.debug(
					LOG_MODULES.EVENT,
					`[Event] FolderSummary → needBytes: ${data.summary?.needBytes ?? 0}`,
				);
			}
		}

		// 5. Item Finalizado (Histórico)
		if (event.type === "ItemFinished") {
			const data = event.data as ItemFinishedData;
			if (data.folder === targetFolder) {
				Logger.debug(
					LOG_MODULES.EVENT,
					`Item finalizado: ${data.item}`,
				);
				void this.plugin.refreshHistory();
			}
		}

		// 6. Atualização de Índice Local (Histórico + Abas)
		// [REFATORADO]: Lógica unificada para evitar duplicidade
		if (event.type === "LocalIndexUpdated") {
			const data = event.data as LocalIndexUpdatedData;

			// Verifica se é a pasta correta
			if (data.folder === targetFolder) {
				// a) Atualiza histórico geral
				void this.plugin.refreshHistory();

				// b) Gerencia ícones das abas (TabManager)
				const rawFiles = data.filenames || data.items;
				const items = Array.isArray(rawFiles) ? rawFiles : [];

				if (items.length > 0) {
					Logger.debug(
						LOG_MODULES.EVENT,
						`Índice local atualizado para ${items.length} arquivos`,
					);
					items.forEach((filename: string) => {
						if (typeof filename === "string") {
							void this.plugin.onFileSyncedEvent(filename);
						}
					});
				}
			}
		}
	}

	private evaluateCombinedState() {
		// Se não estiver idle, cancela qualquer timer pendente imediatamente e aplica cor.
		if (this.lastKnownState !== "idle") {
			if (this.idleGraceTimer) {
				clearTimeout(this.idleGraceTimer);
				this.idleGraceTimer = null;
			}
			if (this.lastKnownState === "error") {
				this.updateStatus("erro");
			} else {
				this.updateStatus("sincronizando");
			}
			return;
		}

		// Se o estado for idle:
		if (this.lastKnownCompletion === 100) {
			// Se o completion já é 100, podemos aplicar verde imediatamente
			if (this.idleGraceTimer) {
				clearTimeout(this.idleGraceTimer);
				this.idleGraceTimer = null;
			}
			this.updateStatus("conectado");
		} else {
			if (!this.idleGraceTimer) {
				this.idleGraceTimer = setTimeout(() => {
					this.lastKnownCompletion = 100;
					this.updateStatus("conectado");
					this.idleGraceTimer = null;
				}, 2000);
			}
			this.updateStatus("sincronizando");
		}
	}

	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}
