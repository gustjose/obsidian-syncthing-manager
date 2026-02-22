import { requestUrl, RequestUrlParam } from "obsidian";
import { Logger, LOG_MODULES } from "../utils/logger";

// --- Interfaces de Tipagem ---
export interface SyncthingStatus {
	myID: string;
	alloc: number;
	cpuPerf: number;
}

export interface SyncthingVersioning {
	type: "trashcan" | "simple" | "staggered" | "external" | "";
	params: Record<string, string>;
}

export interface SyncthingFolder {
	id: string;
	label: string;
	path: string;
	type: string;
	paused?: boolean;
	versioning: SyncthingVersioning;
}

export interface SyncthingDevice {
	deviceID: string;
	name: string;
	address: string[];
	paused: boolean;
}

export interface SyncthingConfig {
	folders: SyncthingFolder[];
	devices: SyncthingDevice[];
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

export interface SyncthingFileEntry {
	name: string;
	size: number;
	modified: string;
	deleted: boolean;
	version: string[];
	sequence: number;
	numBlocks: number;
}

export interface SyncthingFileAvailability {
	id: string;
	fromTemporary: boolean;
}

export interface SyncthingFileStatusResponse {
	global: SyncthingFileEntry;
	local: SyncthingFileEntry;
	availability: SyncthingFileAvailability[];
}

export interface SyncthingIgnores {
	ignore: string[];
	expanded: string[];
}

export interface SyncthingVersion {
	versionTime: string; // The time when the version was archived (Identifier)
	modTime: string; // The modification time of the file content
	size: number;
	version: string[];
}

export class SyncthingAPI {
	// --- System Status & Config ---

	static async getStatus(
		url: string,
		apiKey: string,
	): Promise<SyncthingStatus> {
		return this.request<SyncthingStatus>(
			url,
			apiKey,
			"/rest/system/status",
		);
	}

	static async getConnections(
		url: string,
		apiKey: string,
	): Promise<SyncthingConnectionsResponse> {
		return this.request<SyncthingConnectionsResponse>(
			url,
			apiKey,
			"/rest/system/connections",
		);
	}

	private static configCache: {
		data: SyncthingConfig;
		timestamp: number;
	} | null = null;
	private static CONFIG_TTL = 5000; // 5 segundos

	static async getConfig(
		url: string,
		apiKey: string,
	): Promise<SyncthingConfig> {
		const now = Date.now();
		if (
			this.configCache &&
			now - this.configCache.timestamp < this.CONFIG_TTL
		) {
			return this.configCache.data;
		}

		const config = await this.request<SyncthingConfig>(
			url,
			apiKey,
			"/rest/config",
		);

		this.configCache = { data: config, timestamp: now };
		return config;
	}

	static invalidateConfigCache() {
		this.configCache = null;
	}

	static async getFolders(
		url: string,
		apiKey: string,
	): Promise<SyncthingFolder[]> {
		const config = await this.getConfig(url, apiKey);
		return config.folders;
	}

	static async getDevices(
		url: string,
		apiKey: string,
	): Promise<SyncthingDevice[]> {
		const config = await this.getConfig(url, apiKey);
		return config.devices;
	}

	// --- Folder Operations ---

	static async getFolderStats(
		url: string,
		apiKey: string,
		folderId: string,
	): Promise<SyncthingFolderStats> {
		return this.request<SyncthingFolderStats>(
			url,
			apiKey,
			`/rest/db/status?folder=${folderId}`,
			"GET",
			undefined,
			[404, 500], // Ignora log vermelhos no console caso a pasta não esteja disponível
		);
	}

	/**
	 * Valida proativamente se um dado folderId consta na lista atualizada de pastas do servidor.
	 */
	static async isFolderValid(
		url: string,
		apiKey: string,
		folderId: string,
	): Promise<boolean> {
		try {
			const serverFolders = await this.getFolders(url, apiKey);
			return serverFolders.some((f) => f.id === folderId);
		} catch (error) {
			Logger.error(
				LOG_MODULES.API,
				"Erro de verificação da validade da pasta: falha de contato com o servidor.",
				error,
			);
			// Em caso de falha grave na comunicação com a API de Listagem,
			// não podemos assumir com convicção que a pasta foi apagada. Assumimos true/pendente.
			throw error;
		}
	}

	/**
	 * Força o escaneamento de uma pasta ou de um arquivo específico.
	 * @param path Caminho relativo do arquivo (opcional). Se omitido, escaneia a pasta toda.
	 */
	static async forceScan(
		url: string,
		apiKey: string,
		folderId?: string,
		path?: string,
	): Promise<void> {
		const params = new URLSearchParams();
		if (folderId) params.append("folder", folderId);
		if (path) params.append("sub", path);

		// --- LOG DIAGNÓSTICO 1: Ver a URL final ---
		const queryString = params.toString();
		Logger.debug(
			LOG_MODULES.API,
			`[DEBUG forceScan] Enviando scan. Folder: ${folderId}, Sub: ${path}, Query: ${queryString}`,
		);

		await this.request<void>(
			url,
			apiKey,
			`/rest/db/scan?${queryString}`,
			"POST",
		);
	}

	static async pauseFolder(
		url: string,
		apiKey: string,
		folderId: string,
	): Promise<void> {
		const body = JSON.stringify({ paused: true });
		await this.request<void>(
			url,
			apiKey,
			`/rest/config/folders/${folderId}`,
			"PATCH",
			body,
		);
		this.invalidateConfigCache();
	}

	static async resumeFolder(
		url: string,
		apiKey: string,
		folderId: string,
	): Promise<void> {
		const body = JSON.stringify({ paused: false });
		await this.request<void>(
			url,
			apiKey,
			`/rest/config/folders/${folderId}`,
			"PATCH",
			body,
		);
		this.invalidateConfigCache();
	}

	static async setFolderVersioning(
		url: string,
		apiKey: string,
		folderId: string,
		versioning: SyncthingVersioning,
	): Promise<void> {
		const body = JSON.stringify({ versioning });
		await this.request<void>(
			url,
			apiKey,
			`/rest/config/folders/${folderId}`,
			"PATCH",
			body,
		);
		this.invalidateConfigCache();
	}

	static async getHistory(
		url: string,
		apiKey: string,
		folderId: string,
		ignoredPaths: string,
		myDeviceID: string,
	): Promise<SyncthingHistoryItem[]> {
		const endpoint = `/rest/events?limit=100&events=ItemFinished,LocalIndexUpdated&timeout=0`;

		const events = await this.request<SyncthingEvent[]>(
			url,
			apiKey,
			endpoint,
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

				// Extrai apenas o nome do arquivo
				const displayName = fullPath.split(/[/\\]/).pop() || fullPath;

				const actionType: "deleted" | "updated" | "added" =
					e.data.action === "delete" ? "deleted" : "updated";

				historyMap.set(fullPath, {
					id: e.id,
					filename: displayName,
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

					const displayName =
						fullPath.split(/[/\\]/).pop() || fullPath;

					let direction: "in" | "out" = "out";
					let lastInId = 0;

					if (historyMap.has(fullPath)) {
						const prev = historyMap.get(fullPath);
						if (prev && prev.lastRealInId) {
							lastInId = prev.lastRealInId;
							const diff = e.id - lastInId;

							if (diff < 5) {
								direction = "in";
							}
						}
					}

					historyMap.set(fullPath, {
						id: e.id,
						filename: displayName,
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

	/**
	 * Consulta o banco de dados do Syncthing para um arquivo específico.
	 * Retorna a versão 'global' (cluster) e 'local' (disco).
	 */
	static async getFileInfo(
		url: string,
		apiKey: string,
		folderId: string,
		filePath: string,
	): Promise<SyncthingFileStatusResponse | null> {
		const params = new URLSearchParams({
			folder: folderId,
			file: filePath,
		});

		try {
			// Chama o endpoint /rest/db/file
			return await this.request<SyncthingFileStatusResponse>(
				url,
				apiKey,
				`/rest/db/file?${params.toString()}`,
				"GET",
				undefined,
				[404],
			);
		} catch (error) {
			const errDesc =
				error instanceof Error ? error.message : String(error);
			// 404 significa que o arquivo (novo ou apagado) ainda não consta no banco do Syncthing.
			if (errDesc.includes("404")) {
				return null;
			}
			throw error;
		}
	}

	static async getIgnores(
		url: string,
		apiKey: string,
		folderId: string,
	): Promise<SyncthingIgnores> {
		return this.request<SyncthingIgnores>(
			url,
			apiKey,
			`/rest/db/ignores?folder=${folderId}`,
			"GET",
			undefined,
			[404, 500],
		);
	}

	static async setIgnores(
		url: string,
		apiKey: string,
		folderId: string,
		lines: string[],
	): Promise<void> {
		// A API espera o corpo como JSON: { ignore: ["padrao1", "padrao2"] }
		const body = JSON.stringify({ ignore: lines });

		await this.request<void>(
			url,
			apiKey,
			`/rest/db/ignores?folder=${folderId}`,
			"POST",
			body,
			[404, 500],
		);
	}

	static async getVersions(
		url: string,
		apiKey: string,
		folderId: string,
		path: string,
	): Promise<SyncthingVersion[]> {
		const params = new URLSearchParams({
			folder: folderId,
		});

		try {
			// The endpoint is /rest/folder/versions?folder=...
			// It returns a Map<string, Version[]> (Record<string, SyncthingVersion[]>)
			// We must fetch all and filter by path because the API does not support path filtering (SERVER SIDE).
			const response = await this.request<
				Record<string, SyncthingVersion[]>
			>(
				url,
				apiKey,
				`/rest/folder/versions?${params.toString()}`,
				"GET",
				undefined,
				[500], // Allow 500 (No versions/Versioning disabled)
			);

			// Normalize path to match Syncthing's format (forward slashes)
			const normalizedPath = path.replace(/\\/g, "/");

			// Syncthing response keys are relative paths with forward slashes
			return response?.[normalizedPath] || [];
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			if (errorMessage.includes("500")) {
				Logger.debug(
					LOG_MODULES.API,
					`[getVersions] No versions found or versioning disabled (500) for ${folderId}`,
				);
				return [];
			}
			Logger.error(
				LOG_MODULES.API,
				`Failed to get versions for ${path}`,
				error,
			);
			return [];
		}
	}

	static async restoreVersion(
		url: string,
		apiKey: string,
		folderId: string,
		path: string,
		versionTime: string,
	): Promise<void> {
		const params = new URLSearchParams({
			folder: folderId,
		});

		// Normalize path to use forward slashes
		const normalizedPath = path.replace(/\\/g, "/");

		// The endpoint is POST /rest/folder/versions?folder=...
		// Body should be: { "path/to/file": "versionTime" }
		const body = JSON.stringify({
			[normalizedPath]: versionTime,
		});

		await this.request<void>(
			url,
			apiKey,
			`/rest/folder/versions?${params.toString()}`,
			"POST",
			body,
		);
	}

	// --- HTTP Helper ---

	private static async request<T>(
		url: string,
		apiKey: string,
		endpointPath: string,
		method: string = "GET",
		body?: string,
		allowErrors: number[] = [],
	): Promise<T> {
		const baseUrl = url.replace(/\/$/, "");
		const endpoint = `${baseUrl}${endpointPath}`;

		Logger.debug(LOG_MODULES.API, `Requesting [${method}] ${endpoint}`);

		const headers: Record<string, string> = { "X-API-Key": apiKey };
		if (body) {
			headers["Content-Type"] = "application/json";
		}

		const params: RequestUrlParam = {
			url: endpoint,
			method: method,
			headers: headers,
			body: body,
			throw: false,
		};

		let response;
		try {
			response = await requestUrl(params);
		} catch (error) {
			// A requisição falhou antes mesmo de ter uma resposta (DNS, Offline, Timeout)
			const errDesc =
				error instanceof Error ? error.message : String(error);
			throw new Error(`Failed to fetch: ${errDesc}`);
		}

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
			if (!allowErrors.includes(response.status)) {
				Logger.error(
					LOG_MODULES.API,
					`[DEBUG Request Error] Falha em ${endpoint}. Status: ${response.status}. Body: ${response.text}`,
				);
			}
			throw new Error(`HTTP Error ${response.status}: ${endpointPath}`);
		}
	}
}
