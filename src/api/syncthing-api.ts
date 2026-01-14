import { requestUrl, RequestUrlParam } from "obsidian";

// --- Interfaces de Tipagem ---
export interface SyncthingStatus {
	myID: string;
	alloc: number;
	cpuPerf: number;
}

export interface SyncthingFolder {
	id: string;
	label: string;
	path: string;
	type: string;
}

export interface SyncthingConfig {
	folders: SyncthingFolder[];
}

export interface SyncthingFolderStats {
	state: string;
	needBytes: number;
	needItems: number;
}

export interface SyncthingConnection {
	connected: boolean;
	inBytesTotal: number;
	outBytesTotal: number;
}

export interface SyncthingConnectionsResponse {
	connections: Record<string, SyncthingConnection>;
	total: SyncthingConnection;
}

export interface SyncthingEvent {
	id: number;
	type: string;
	time: string;
	data: {
		item?: string;
		items?: string[];
		filenames?: string[];
		folder?: string;
		type?: string;
		action?: string;
	};
}

export interface SyncthingHistoryItem {
	id: number;
	filename: string;
	action: "deleted" | "updated" | "added";
	direction: "in" | "out";
	timestamp: string;
}

export interface SyncthingRecentChange {
	path: string;
	modifiedBy: string;
	type: string;
	modified: string;
}

export class SyncthingAPI {
	// --- System Status & Config ---

	static async getStatus(
		url: string,
		apiKey: string
	): Promise<SyncthingStatus> {
		return this.request<SyncthingStatus>(
			url,
			apiKey,
			"/rest/system/status"
		);
	}

	static async getConnections(
		url: string,
		apiKey: string
	): Promise<SyncthingConnectionsResponse> {
		return this.request<SyncthingConnectionsResponse>(
			url,
			apiKey,
			"/rest/system/connections"
		);
	}

	static async getFolders(
		url: string,
		apiKey: string
	): Promise<SyncthingFolder[]> {
		const config = await this.request<SyncthingConfig>(
			url,
			apiKey,
			"/rest/config"
		);
		return config.folders;
	}

	// --- Folder Operations ---

	static async getFolderStats(
		url: string,
		apiKey: string,
		folderId: string
	): Promise<SyncthingFolderStats> {
		return this.request<SyncthingFolderStats>(
			url,
			apiKey,
			`/rest/db/status?folder=${folderId}`
		);
	}

	static async forceScan(
		url: string,
		apiKey: string,
		folderId?: string
	): Promise<void> {
		let endpoint = "/rest/db/scan";

		if (folderId) {
			endpoint += `?folder=${folderId}`;
		}

		await this.request<void>(url, apiKey, endpoint, "POST");
	}

	static async getHistory(
		url: string,
		apiKey: string,
		folderId: string,
		ignoredPaths: string,
		myDeviceID: string
	): Promise<SyncthingHistoryItem[]> {
		const endpoint = `/rest/events?limit=100&events=ItemFinished,LocalIndexUpdated`;

		const events = await this.request<SyncthingEvent[]>(
			url,
			apiKey,
			endpoint
		);

		const patterns = ignoredPaths
			.split(",")
			.map((p) => p.trim())
			.filter((p) => p !== "");

		const historyMap = new Map<
			string,
			SyncthingHistoryItem & { lastRealInId?: number }
		>();

		(events || []).forEach((e) => {
			if (!e.data || e.data.folder !== folderId) return;

			const timestamp = new Date(e.time).toLocaleTimeString();

			// --- CASO 1: ItemFinished (Recebido) ---
			if (e.type === "ItemFinished") {
				const fullPath = e.data.item || "Unknown";

				// Verifica ignorados usando o caminho completo (mais seguro)
				if (patterns.some((p) => fullPath.includes(p))) return;

				// Extrai apenas o nome do arquivo (suporta barras / ou invertidas \)
				const displayName = fullPath.split(/[/\\]/).pop() || fullPath;

				const actionType: "deleted" | "updated" | "added" =
					e.data.action === "delete" ? "deleted" : "updated";

				historyMap.set(fullPath, {
					// Chave continua sendo o caminho completo
					id: e.id,
					filename: displayName, // Exibição limpa
					direction: "in",
					action: actionType,
					timestamp: timestamp,
					lastRealInId: e.id,
				});
			}

			// --- CASO 2: LocalIndexUpdated (Local/Saída) ---
			if (e.type === "LocalIndexUpdated") {
				const rawFiles = e.data.filenames || e.data.items;
				const fileList: string[] = Array.isArray(rawFiles)
					? rawFiles
					: [];

				if (fileList.length === 0) return;

				fileList.forEach((fullPath) => {
					if (typeof fullPath !== "string") return;
					if (patterns.some((p) => fullPath.includes(p))) return;

					// Extrai apenas o nome do arquivo
					const displayName =
						fullPath.split(/[/\\]/).pop() || fullPath;

					let direction: "in" | "out" = "out";
					let lastInId = 0;

					if (historyMap.has(fullPath)) {
						const prev = historyMap.get(fullPath);
						if (prev && prev.lastRealInId) {
							lastInId = prev.lastRealInId;
							const diff = e.id - lastInId;

							// Tolerância de 5 eventos
							if (diff < 5) {
								direction = "in";
							}
						}
					}

					historyMap.set(fullPath, {
						// Chave continua sendo o caminho completo
						id: e.id,
						filename: displayName, // Exibição limpa
						direction: direction,
						action: "updated",
						timestamp: timestamp,
						lastRealInId: lastInId,
					});
				});
			}
		});

		return Array.from(historyMap.values())
			.sort((a, b) => b.id - a.id)
			.slice(0, 10)
			.map(({ lastRealInId, ...item }) => item);
	}

	// --- HTTP Helper ---

	private static async request<T>(
		url: string,
		apiKey: string,
		endpointPath: string,
		method: string = "GET"
	): Promise<T> {
		const baseUrl = url.replace(/\/$/, "");
		const endpoint = `${baseUrl}${endpointPath}`;

		console.debug(`ST-Debug: Requesting [${method}] ${endpoint}`);

		const params: RequestUrlParam = {
			url: endpoint,
			method: method,
			headers: { "X-API-Key": apiKey },
		};

		const response = await requestUrl(params);

		if (response.status >= 200 && response.status < 300) {
			if (response.text && response.text.length > 0) {
				try {
					return response.json as T;
				} catch {
					return {} as T;
				}
			}
			return {} as T;
		} else {
			throw new Error(`HTTP Error ${response.status}: ${endpointPath}`);
		}
	}
}
