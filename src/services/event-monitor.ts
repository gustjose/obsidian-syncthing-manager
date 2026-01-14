import { requestUrl } from "obsidian";
import SyncthingController from "../main";

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

export class SyncthingEventMonitor {
	plugin: SyncthingController;
	running: boolean = false;
	lastEventId: number = 0;

	constructor(plugin: SyncthingController) {
		this.plugin = plugin;
	}

	async start(): Promise<void> {
		if (this.running) return;

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
				const lastEvent = response.json[
					response.json.length - 1
				] as SyncthingEvent;
				this.lastEventId = lastEvent.id;
			}
		} catch (e) {
			console.error("Erro ao buscar ID inicial:", e);
		}

		this.running = true;
		void this.loop();
	}

	stop(): void {
		this.running = false;
	}

	private async loop(): Promise<void> {
		while (this.running) {
			try {
				if (!this.plugin.settings.syncthingApiKey) {
					await this.sleep(5000);
					continue;
				}

				const url = `${this.plugin.apiUrl}/rest/events?since=${this.lastEventId}&timeout=60`;

				const response = await requestUrl({
					url: url,
					method: "GET",
					headers: {
						"X-API-Key": this.plugin.settings.syncthingApiKey,
					},
				});

				if (response.status === 200) {
					const events = response.json as SyncthingEvent[];
					if (Array.isArray(events) && events.length > 0) {
						for (const event of events) {
							this.lastEventId = event.id;
							this.processEvent(event);
						}
					}
				}
			} catch {
				await this.sleep(2000);
			}
		}
	}

	private processEvent(event: SyncthingEvent) {
		const targetFolder = this.plugin.settings.syncthingFolderId;
		if (!targetFolder) return;

		if (
			event.type === "DeviceConnected" ||
			event.type === "DeviceDisconnected"
		) {
			void this.plugin.atualizarContagemDispositivos();
		}

		if (event.type === "FolderCompletion") {
			const data = event.data as FolderCompletionData;

			if (data && typeof data === "object" && "folder" in data) {
				if (data.folder === targetFolder) {
					if (data.completion < 100 || data.needBytes > 0) {
						this.plugin.atualizarStatusBar("sincronizando");
					} else {
						this.plugin.lastSyncTime =
							new Date().toLocaleTimeString([], {
								hour: "2-digit",
								minute: "2-digit",
							});
						this.plugin.atualizarStatusBar("conectado");
					}
				}
			}
		}

		if (event.type === "StateChanged") {
			const data = event.data as StateChangedData;

			if (data && typeof data === "object" && "folder" in data) {
				if (data.folder === targetFolder) {
					if (data.to === "scanning" || data.to === "syncing") {
						this.plugin.atualizarStatusBar("sincronizando");
					} else if (data.to === "idle") {
						this.plugin.lastSyncTime =
							new Date().toLocaleTimeString([], {
								hour: "2-digit",
								minute: "2-digit",
							});
						this.plugin.atualizarStatusBar("conectado");
					} else if (data.to === "error") {
						this.plugin.atualizarStatusBar("erro");
					}
				}
			}
		}

		if (event.type === "FolderSummary") {
			const data = event.data as FolderSummaryData;

			if (data && typeof data === "object" && "folder" in data) {
				if (data.folder === targetFolder) {
					if (data.summary && data.summary.needBytes > 0) {
						this.plugin.atualizarStatusBar("sincronizando");
					} else {
						this.plugin.lastSyncTime =
							new Date().toLocaleTimeString([], {
								hour: "2-digit",
								minute: "2-digit",
							});
						this.plugin.atualizarStatusBar("conectado");
					}
				}
			}
		}

		if (event.type === "ItemFinished") {
			const data = event.data as {
				folder: string;
				item: string;
				action: string;
			};

			if (data && data.folder === targetFolder) {
				void this.plugin.refreshHistory();
			}
		}

		if (event.type === "LocalIndexUpdated") {
			const data = event.data as { folder: string; items: string[] };
			if (data && data.folder === targetFolder) {
				void this.plugin.refreshHistory();
			}
		}

		if (event.type === "LocalIndexUpdated") {
			const data = event.data as {
				filenames?: string[];
				items?: string[];
			};

			const rawFiles = data.filenames || data.items;
			const items = Array.isArray(rawFiles) ? rawFiles : [];

			if (items.length > 0) {
				void this.plugin.refreshHistory();

				items.forEach((filename: string) => {
					if (typeof filename === "string") {
						this.plugin.tabManager.setSynced(filename);
					}
				});
			}
		}
	}

	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}
