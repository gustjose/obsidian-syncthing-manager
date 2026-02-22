export const LOG_MODULES = {
	MAIN: "Main",
	API: "API",
	EVENT: "EventMonitor",
	IGNORE: "IgnoreManager",
	TAB: "TabManager",
	CONFLICT: "ConflictManager",
	FILE_STATE: "FileStateManager",
} as const;

export type LogModule = (typeof LOG_MODULES)[keyof typeof LOG_MODULES];

export type LogLevel = "off" | "error" | "warn" | "debug";

export interface LogEntry {
	timestamp: string;
	level: "error" | "warn" | "debug";
	module: LogModule;
	message: string;
	details?: string;
}

type LogListener = (entry: LogEntry) => void;

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
	off: 0,
	error: 1,
	warn: 2,
	debug: 3,
};

const MAX_BUFFER_SIZE = 200;

export class Logger {
	private static isDebugMode: boolean = false;
	private static logLevel: LogLevel = "debug";
	private static activeModules: Set<string> = new Set();
	private static buffer: LogEntry[] = [];
	private static listeners: LogListener[] = [];

	static setDebugMode(enabled: boolean) {
		this.isDebugMode = enabled;
	}

	static setLogLevel(level: LogLevel) {
		this.logLevel = level;
	}

	static setActiveModules(modules: string[]) {
		this.activeModules = new Set(modules);
	}

	/**
	 * Registra um listener que será chamado sempre que uma nova entrada for adicionada ao buffer.
	 * Retorna uma função para remover o listener (unsubscribe).
	 */
	static onNewEntry(listener: LogListener): () => void {
		this.listeners.push(listener);
		return () => {
			this.listeners = this.listeners.filter((l) => l !== listener);
		};
	}

	/**
	 * Retorna o nível efetivo: se debugMode está OFF, só loga errors.
	 * Se debugMode está ON, respeita o logLevel configurado.
	 */
	private static getEffectiveLevel(): number {
		if (!this.isDebugMode) return LOG_LEVEL_PRIORITY.error;
		return LOG_LEVEL_PRIORITY[this.logLevel];
	}

	/**
	 * Log de Debug: Só aparece se debugMode + módulo ativo + nível >= DEBUG.
	 */
	static debug(module: LogModule, message: string, ...args: unknown[]) {
		const effective = this.getEffectiveLevel();
		if (
			effective >= LOG_LEVEL_PRIORITY.debug &&
			this.activeModules.has(module)
		) {
			console.debug(`[ST-${module}] ${message}`, ...args);
			this.pushToBuffer("debug", module, message, args);
		}
	}

	/**
	 * Log de Aviso: Loga se nível efetivo >= WARN. Sempre vai ao console.
	 */
	static warn(module: LogModule, message: string, ...args: unknown[]) {
		console.warn(`[ST-${module}] ⚠️ ${message}`, ...args);
		if (this.getEffectiveLevel() >= LOG_LEVEL_PRIORITY.warn) {
			this.pushToBuffer("warn", module, message, args);
		}
	}

	/**
	 * Log de Erro: Sempre loga (console + buffer).
	 */
	static error(module: LogModule, message: string, ...args: unknown[]) {
		console.error(`[ST-${module}] ❌ ${message}`, ...args);
		this.pushToBuffer("error", module, message, args);
	}

	/**
	 * Retorna todas as entradas do buffer.
	 */
	static getEntries(): LogEntry[] {
		return [...this.buffer];
	}

	/**
	 * Limpa o buffer de logs.
	 */
	static clearBuffer() {
		this.buffer = [];
	}

	/**
	 * Serializa os detalhes do erro de forma segura, removendo caminhos absolutos do sistema.
	 */
	private static sanitizeDetails(args: unknown[]): string | undefined {
		if (args.length === 0) return undefined;

		try {
			const raw = args
				.map((a) => {
					if (a instanceof Error) return a.message;
					if (typeof a === "string") return a;
					return JSON.stringify(a);
				})
				.join(" ");

			return raw
				.replace(/[A-Z]:\\[^\s"',)}\]]+/gi, "<path>")
				.replace(
					/\/(?:home|Users|var|tmp|etc)\/[^\s"',)}\]]+/g,
					"<path>",
				);
		} catch {
			return "(unserializable)";
		}
	}

	/**
	 * Adiciona uma entrada ao buffer circular e notifica listeners.
	 */
	private static pushToBuffer(
		level: "error" | "warn" | "debug",
		module: LogModule,
		message: string,
		args: unknown[],
	) {
		const entry: LogEntry = {
			timestamp: new Date().toISOString(),
			level,
			module,
			message,
			details: this.sanitizeDetails(args),
		};

		this.buffer.push(entry);

		if (this.buffer.length > MAX_BUFFER_SIZE) {
			this.buffer.shift();
		}

		for (const listener of this.listeners) {
			try {
				listener(entry);
			} catch {
				// Listener falhou, ignora silenciosamente
			}
		}
	}
}
