import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { Logger, LOG_MODULES } from "../src/utils/logger";

describe("Logger", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		Logger.setDebugMode(false);
		Logger.setLogLevel("debug");
		Logger.setActiveModules([]);
		Logger.clearBuffer();
		vi.spyOn(console, "debug").mockImplementation(() => {});
		vi.spyOn(console, "warn").mockImplementation(() => {});
		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("debug()", () => {
		it("não loga quando debugMode está OFF", () => {
			Logger.setDebugMode(false);
			Logger.setActiveModules([LOG_MODULES.MAIN]);

			Logger.debug(LOG_MODULES.MAIN, "test message");

			expect(console.debug).not.toHaveBeenCalled();
			expect(Logger.getEntries()).toHaveLength(0);
		});

		it("loga quando debugMode ON + módulo ativo", () => {
			Logger.setDebugMode(true);
			Logger.setActiveModules([LOG_MODULES.MAIN]);

			Logger.debug(LOG_MODULES.MAIN, "test message");

			expect(console.debug).toHaveBeenCalledOnce();
			expect(Logger.getEntries()).toHaveLength(1);
			expect(Logger.getEntries()[0].level).toBe("debug");
		});

		it("não loga quando debugMode ON mas módulo inativo", () => {
			Logger.setDebugMode(true);
			Logger.setActiveModules([LOG_MODULES.API]);

			Logger.debug(LOG_MODULES.MAIN, "should not log");

			expect(console.debug).not.toHaveBeenCalled();
			expect(Logger.getEntries()).toHaveLength(0);
		});
	});

	describe("warn()", () => {
		it("sempre envia ao console", () => {
			Logger.setDebugMode(false);

			Logger.warn(LOG_MODULES.MAIN, "warning");

			expect(console.warn).toHaveBeenCalledOnce();
		});
	});

	describe("error()", () => {
		it("sempre envia ao console e ao buffer", () => {
			Logger.setDebugMode(false);

			Logger.error(LOG_MODULES.MAIN, "critical error");

			expect(console.error).toHaveBeenCalledOnce();
			expect(Logger.getEntries()).toHaveLength(1);
			expect(Logger.getEntries()[0].level).toBe("error");
		});
	});

	describe("buffer circular", () => {
		it("descarta entradas mais antigas ao exceder 200", () => {
			Logger.setDebugMode(true);
			Logger.setActiveModules([LOG_MODULES.MAIN]);

			for (let i = 0; i < 210; i++) {
				Logger.debug(LOG_MODULES.MAIN, `msg-${i}`);
			}

			const entries = Logger.getEntries();
			expect(entries).toHaveLength(200);
			expect(entries[0].message).toBe("msg-10");
			expect(entries[199].message).toBe("msg-209");
		});
	});

	describe("listeners", () => {
		it("recebe entradas novas", () => {
			const listener = vi.fn();
			Logger.onNewEntry(listener);

			Logger.error(LOG_MODULES.MAIN, "test");

			expect(listener).toHaveBeenCalledOnce();
			expect(listener.mock.calls[0][0].message).toBe("test");
		});

		it("unsubscribe remove o listener", () => {
			const listener = vi.fn();
			const unsubscribe = Logger.onNewEntry(listener);

			unsubscribe();
			Logger.error(LOG_MODULES.MAIN, "test");

			expect(listener).not.toHaveBeenCalled();
		});
	});

	describe("sanitizeDetails", () => {
		it("remove caminhos absolutos do Windows", () => {
			Logger.error(
				LOG_MODULES.MAIN,
				"error",
				"C:\\Users\\Gustavo\\file.txt",
			);

			const entries = Logger.getEntries();
			expect(entries[0].details).toBe("<path>");
			expect(entries[0].details).not.toContain("Gustavo");
		});
	});
});
