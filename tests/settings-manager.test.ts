import { describe, it, expect, beforeEach, vi } from "vitest";
import { SettingsManager } from "../src/services/settings-manager";
import { SecretManager } from "../src/services/secret-manager";
import {
	DEFAULT_SETTINGS,
	LS_KEY_HOST,
	LS_KEY_PORT,
	LS_KEY_HTTPS,
} from "../src/types";
import { localStorageStore } from "./setup";

function createMockPlugin() {
	return {
		loadData: vi.fn().mockResolvedValue({}),
		saveData: vi.fn().mockResolvedValue(undefined),
	};
}

function createMockSecretManager() {
	return {
		migrateIfNeeded: vi.fn(),
		loadApiKey: vi.fn().mockReturnValue(""),
		saveApiKey: vi.fn(),
	} as unknown as SecretManager;
}

describe("SettingsManager", () => {
	beforeEach(() => {
		for (const key in localStorageStore) {
			delete localStorageStore[key];
		}
	});

	describe("loadSettings()", () => {
		it("faz merge correto de defaults com dados parciais", async () => {
			const plugin = createMockPlugin();
			const secret = createMockSecretManager();
			plugin.loadData.mockResolvedValue({
				showStatusBar: false,
				language: "pt",
			});

			const manager = new SettingsManager(plugin as never, secret);
			const settings = await manager.loadSettings();

			expect(settings.showStatusBar).toBe(false);
			expect(settings.language).toBe("pt");
			expect(settings.updateInterval).toBe(
				DEFAULT_SETTINGS.updateInterval,
			);
			expect(settings.showRibbonIcon).toBe(
				DEFAULT_SETTINGS.showRibbonIcon,
			);
		});

		it("limpa placeholder 'device-specific' para string vazia", async () => {
			const plugin = createMockPlugin();
			const secret = createMockSecretManager();
			plugin.loadData.mockResolvedValue({
				syncthingHost: "device-specific",
				syncthingPort: "device-specific",
			});

			const manager = new SettingsManager(plugin as never, secret);
			const settings = await manager.loadSettings();

			expect(settings.syncthingHost).toBe("");
			expect(settings.syncthingPort).toBe("");
		});

		it("valores do localStorage sobrescrevem defaults", async () => {
			const plugin = createMockPlugin();
			const secret = createMockSecretManager();
			localStorageStore[LS_KEY_HOST] = "192.168.1.1";
			localStorageStore[LS_KEY_PORT] = "9999";
			localStorageStore[LS_KEY_HTTPS] = "true";

			const manager = new SettingsManager(plugin as never, secret);
			const settings = await manager.loadSettings();

			expect(settings.syncthingHost).toBe("192.168.1.1");
			expect(settings.syncthingPort).toBe("9999");
			expect(settings.useHttps).toBe(true);
		});

		it("chama migrateIfNeeded do SecretManager", async () => {
			const plugin = createMockPlugin();
			const secret = createMockSecretManager();

			const manager = new SettingsManager(plugin as never, secret);
			await manager.loadSettings();

			expect(secret.migrateIfNeeded).toHaveBeenCalledOnce();
		});
	});

	describe("saveSettings()", () => {
		it("persiste no data.json com placeholders device-specific", async () => {
			const plugin = createMockPlugin();
			const secret = createMockSecretManager();
			const manager = new SettingsManager(plugin as never, secret);
			const settings = {
				...DEFAULT_SETTINGS,
				syncthingHost: "192.168.1.1",
			};

			await manager.saveSettings(settings);

			const savedData = plugin.saveData.mock.calls[0][0];
			expect(savedData.syncthingHost).toBe("device-specific");
			expect(savedData.syncthingApiKey).toBe("device-specific");
		});

		it("delega API key ao SecretManager", async () => {
			const plugin = createMockPlugin();
			const secret = createMockSecretManager();
			const manager = new SettingsManager(plugin as never, secret);
			const settings = { ...DEFAULT_SETTINGS, syncthingApiKey: "my-key" };

			await manager.saveSettings(settings);

			expect(secret.saveApiKey).toHaveBeenCalledWith("my-key");
		});
	});
});
