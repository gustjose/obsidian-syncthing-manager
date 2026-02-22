import { describe, it, expect, beforeEach, vi } from "vitest";
import { SecretManager } from "../src/services/secret-manager";
import { LS_KEY_API, SECRET_KEY_API } from "../src/types";
import { localStorageStore } from "./setup";

/** Cria um App mock com secretStorage opcional. */
function createMockApp(withKeychain = true) {
	const app: {
		secretStorage?: {
			getSecret: ReturnType<typeof vi.fn>;
			setSecret: ReturnType<typeof vi.fn>;
			listSecrets: ReturnType<typeof vi.fn>;
		};
	} = {};

	if (withKeychain) {
		app.secretStorage = {
			getSecret: vi.fn().mockReturnValue(null),
			setSecret: vi.fn(),
			listSecrets: vi.fn().mockReturnValue([]),
		};
	}

	return app;
}

describe("SecretManager", () => {
	beforeEach(() => {
		// Limpa o store do localStorage mock
		for (const key in localStorageStore) {
			delete localStorageStore[key];
		}
	});

	describe("hasKeychainSupport", () => {
		it("retorna true quando secretStorage existe", () => {
			const app = createMockApp(true);
			const manager = new SecretManager(app as never);
			expect(manager.hasKeychainSupport).toBe(true);
		});

		it("retorna false quando secretStorage está ausente", () => {
			const app = createMockApp(false);
			const manager = new SecretManager(app as never);
			expect(manager.hasKeychainSupport).toBe(false);
		});
	});

	describe("loadApiKey()", () => {
		it("prioriza Keychain sobre localStorage", () => {
			const app = createMockApp(true);
			app.secretStorage!.getSecret.mockReturnValue("keychain-value");
			localStorageStore[LS_KEY_API] = "local-value";

			const manager = new SecretManager(app as never);
			expect(manager.loadApiKey()).toBe("keychain-value");
		});

		it("usa localStorage quando Keychain está vazio", () => {
			const app = createMockApp(true);
			app.secretStorage!.getSecret.mockReturnValue(null);
			localStorageStore[LS_KEY_API] = "local-value";

			const manager = new SecretManager(app as never);
			expect(manager.loadApiKey()).toBe("local-value");
		});

		it("retorna string vazia quando ambos estão vazios", () => {
			const app = createMockApp(true);
			app.secretStorage!.getSecret.mockReturnValue(null);

			const manager = new SecretManager(app as never);
			expect(manager.loadApiKey()).toBe("");
		});
	});

	describe("saveApiKey()", () => {
		it("salva em ambos Keychain e localStorage", () => {
			const app = createMockApp(true);
			const manager = new SecretManager(app as never);

			manager.saveApiKey("my-api-key");

			expect(app.secretStorage!.setSecret).toHaveBeenCalledWith(
				SECRET_KEY_API,
				"my-api-key",
			);
			expect(localStorageStore[LS_KEY_API]).toBe("my-api-key");
		});
	});

	describe("migrateIfNeeded()", () => {
		it("move key do localStorage para o Keychain", () => {
			const app = createMockApp(true);
			app.secretStorage!.getSecret.mockReturnValue(null);
			localStorageStore[LS_KEY_API] = "old-key";

			const manager = new SecretManager(app as never);
			manager.migrateIfNeeded();

			expect(app.secretStorage!.setSecret).toHaveBeenCalledWith(
				SECRET_KEY_API,
				"old-key",
			);
			expect(localStorageStore[LS_KEY_API]).toBeUndefined();
		});

		it("não migra se Keychain já tem valor", () => {
			const app = createMockApp(true);
			app.secretStorage!.getSecret.mockReturnValue("existing-key");
			localStorageStore[LS_KEY_API] = "old-key";

			const manager = new SecretManager(app as never);
			manager.migrateIfNeeded();

			expect(app.secretStorage!.setSecret).not.toHaveBeenCalled();
			expect(localStorageStore[LS_KEY_API]).toBe("old-key");
		});

		it("não faz nada sem suporte a Keychain", () => {
			const app = createMockApp(false);
			localStorageStore[LS_KEY_API] = "old-key";

			const manager = new SecretManager(app as never);
			manager.migrateIfNeeded();

			expect(localStorageStore[LS_KEY_API]).toBe("old-key");
		});
	});
});
