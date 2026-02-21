import { App, debounce } from "obsidian";
import { Logger, LOG_MODULES } from "../utils/logger";

// Tipos de Estado
export type FileSyncStatus = "pending" | "synced";

export interface FileState {
	path: string;
	status: FileSyncStatus;
	lastLocalEdit: number;
	lastSyncCheck?: number;
}

interface StateData {
	version: number;
	activeFiles: Record<string, FileState>;
}

export class FileStateManager {
	private app: App;
	private pluginDir: string;
	private stateFile = "sync-state.json";
	private data: StateData = { version: 1, activeFiles: {} };

	// Configurações de Limpeza (Garbage Collection)
	private readonly MAX_SYNCED_HISTORY = 50;
	private readonly SYNCED_TTL_MS = 24 * 60 * 60 * 1000;

	constructor(app: App, manifestDir: string) {
		this.app = app;
		this.pluginDir = manifestDir;

		this.requestSave = debounce(
			async () => {
				await this.saveImmediate();
			},
			2000,
			true,
		);
	}

	/**
	 * Carrega o estado do disco
	 */
	async load() {
		const adapter = this.app.vault.adapter;
		const filePath = `${this.pluginDir}/${this.stateFile}`;

		if (await adapter.exists(filePath)) {
			try {
				const content = await adapter.read(filePath);
				this.data = JSON.parse(content) as StateData;

				// Limpa arquivos temporários do Syncthing salvos acidentalmente em versões anteriores
				for (const key in this.data.activeFiles) {
					if (key.includes("~syncthing~")) {
						delete this.data.activeFiles[key];
					}
				}

				Logger.debug(
					LOG_MODULES.FILE_STATE,
					`Estado carregado: ${Object.keys(this.data.activeFiles).length} arquivos ativos.`,
				);
			} catch (e) {
				Logger.error(
					LOG_MODULES.FILE_STATE,
					"Erro ao carregar sync-state.json",
					e,
				);
				this.data = { version: 1, activeFiles: {} };
			}
		}
	}

	/**
	 * Regista uma edição local (Marca como 'pending')
	 */
	markAsDirty(path: string) {
		// Normaliza para garantir consistência interna (sempre /)
		const normalizedPath = path.replace(/\\/g, "/");
		const now = Date.now();

		this.data.activeFiles[normalizedPath] = {
			path: normalizedPath,
			status: "pending",
			lastLocalEdit: now,
		};
		this.requestSave();
	}

	/**
	 * Regista uma sincronização confirmada (Marca como 'synced')
	 * Agora com busca inteligente para resolver diferenças de caminho (Windows/Linux/Prefixos)
	 */
	markAsSynced(incomingPath: string) {
		// Tenta encontrar a chave correspondente no banco
		const matchedKey = this.findMatchingKey(incomingPath);

		if (matchedKey) {
			const now = Date.now();
			const entry = this.data.activeFiles[matchedKey];

			if (entry) {
				// Log essencial: Confirma que o sistema linkou o evento ao arquivo
				Logger.debug(
					LOG_MODULES.FILE_STATE,
					`Sincronizado: "${matchedKey}"`,
				);

				entry.status = "synced";
				entry.lastSyncCheck = now;
				this.requestSave();
			}
		}
	}

	/**
	 * Helper para encontrar a chave correta no objeto activeFiles
	 * lida com diferenças de barras e prefixos de pasta.
	 */
	private findMatchingKey(incomingPath: string): string | null {
		const normalizedIncoming = incomingPath.replace(/\\/g, "/");
		const storedKeys = Object.keys(this.data.activeFiles);

		// 1. Tentativa Direta (Exata)
		if (this.data.activeFiles[normalizedIncoming]) {
			return normalizedIncoming;
		}

		// 2. Busca por Sufixo (Resolve o problema "dev-obsidian/arquivo.md" vs "arquivo.md")
		for (const key of storedKeys) {
			const normalizedKey = key.replace(/\\/g, "/");

			// Verifica se o caminho que veio do Syncthing termina com o caminho do Obsidian
			if (normalizedIncoming.endsWith(normalizedKey)) {
				const index = normalizedIncoming.lastIndexOf(normalizedKey);
				// O match deve ser exato ou precedido por uma barra para evitar falsos positivos
				if (index === 0 || normalizedIncoming[index - 1] === "/") {
					return key;
				}
			}
		}

		return null;
	}

	/**
	 * Retorna todos os ficheiros que ainda estão pendentes
	 */
	getPendingFiles(): FileState[] {
		return Object.values(this.data.activeFiles).filter(
			(f) => f.status === "pending",
		);
	}

	/**
	 * Obtém o estado de um ficheiro específico
	 */
	getState(path: string): FileState | undefined {
		const key = this.findMatchingKey(path);
		return key ? this.data.activeFiles[key] : undefined;
	}

	/**
	 * Debounce wrapper para o save
	 */
	requestSave: () => void;

	/**
	 * Gravação física no disco com Garbage Collection
	 */
	private async saveImmediate() {
		this.performGarbageCollection();

		const adapter = this.app.vault.adapter;
		const filePath = `${this.pluginDir}/${this.stateFile}`;

		try {
			await adapter.write(filePath, JSON.stringify(this.data, null, 2));
		} catch (e) {
			Logger.error(LOG_MODULES.FILE_STATE, "Erro ao guardar estado", e);
		}
	}

	/**
	 * Limpeza automática para manter o ficheiro leve
	 */
	private performGarbageCollection() {
		const now = Date.now();
		const entries = Object.values(this.data.activeFiles);
		// const initialCount = entries.length;

		// 1. Separa pendentes (nunca apagar) e sincronizados
		const pending = entries.filter((f) => f.status === "pending");
		let synced = entries.filter((f) => f.status === "synced");

		// 2. Remove sincronizados muito antigos (TTL)
		synced = synced.filter((f) => {
			return (
				f.lastSyncCheck && now - f.lastSyncCheck < this.SYNCED_TTL_MS
			);
		});

		// 3. Limita a quantidade máxima de sincronizados (mantém os mais recentes)
		if (synced.length > this.MAX_SYNCED_HISTORY) {
			synced.sort(
				(a, b) => (b.lastSyncCheck || 0) - (a.lastSyncCheck || 0),
			);
			synced = synced.slice(0, this.MAX_SYNCED_HISTORY);
		}

		// 4. Reconstrói o objeto
		const newActiveFiles: Record<string, FileState> = {};
		[...pending, ...synced].forEach((f) => {
			newActiveFiles[f.path] = f;
		});

		this.data.activeFiles = newActiveFiles;
	}
}
