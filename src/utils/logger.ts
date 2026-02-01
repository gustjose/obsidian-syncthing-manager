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

export class Logger {
	private static activeModules: Set<LogModule> = new Set([
		LOG_MODULES.MAIN,
		LOG_MODULES.API,
		// LOG_MODULES.EVENT,
		// LOG_MODULES.TAB,
		// LOG_MODULES.CONFLICT,
		// LOG_MODULES.IGNORE,
		LOG_MODULES.FILE_STATE,
	]);

	/**
	 * Log de Debug: Só aparece se o módulo estiver ativo na lista acima.
	 */
	static debug(module: LogModule, message: string, ...args: unknown[]) {
		if (this.activeModules.has(module)) {
			console.debug(`[ST-${module}] ${message}`, ...args);
		}
	}

	/**
	 * Log de Erro
	 */
	static error(module: LogModule, message: string, ...args: unknown[]) {
		console.error(`[ST-${module}] ❌ ${message}`, ...args);
	}

	/**
	 * Log de Aviso
	 */
	static warn(module: LogModule, message: string, ...args: unknown[]) {
		console.warn(`[ST-${module}] ⚠️ ${message}`, ...args);
	}
}
