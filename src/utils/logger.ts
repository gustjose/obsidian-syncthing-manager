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

export interface LogEntry {
	timestamp: string;
	level: "error" | "warn";
	module: LogModule;
	message: string;
	details?: string;
}

const MAX_BUFFER_SIZE = 50;

export class Logger {
	private static isDebugMode: boolean = false;

	private static activeModules: Set<string> = new Set();

	private static buffer: LogEntry[] = [];

	static setDebugMode(enabled: boolean) {
		this.isDebugMode = enabled;
	}

	static setActiveModules(modules: string[]) {
		this.activeModules = new Set(modules);
	}

	/**
	 * Log de Debug: Só aparece se o módulo estiver ativo na lista acima E o modo debug estiver ligado.
	 */
	static debug(module: LogModule, message: string, ...args: unknown[]) {
		if (this.isDebugMode && this.activeModules.has(module)) {
			console.debug(`[ST-${module}] ${message}`, ...args);
		}
	}

	/**
	 * Log de Erro: Sempre exibe no console e armazena no buffer.
	 */
	static error(module: LogModule, message: string, ...args: unknown[]) {
		console.error(`[ST-${module}] ❌ ${message}`, ...args);
		this.pushToBuffer("error", module, message, args);
	}

	/**
	 * Log de Aviso: Sempre exibe no console e armazena no buffer.
	 */
	static warn(module: LogModule, message: string, ...args: unknown[]) {
		console.warn(`[ST-${module}] ⚠️ ${message}`, ...args);
		this.pushToBuffer("warn", module, message, args);
	}

	/**
	 * Retorna os últimos erros/avisos armazenados no buffer.
	 */
	static getEntries(): LogEntry[] {
		return [...this.buffer];
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

			// Remove caminhos absolutos do sistema (Windows e Unix)
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
	 * Adiciona uma entrada ao buffer circular.
	 */
	private static pushToBuffer(
		level: "error" | "warn",
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
	}
}
