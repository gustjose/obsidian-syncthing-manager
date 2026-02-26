import { describe, it, expect, beforeEach, vi } from "vitest";
import { FileStateManager } from "../src/services/file-state-manager";

function createMockApp() {
	return {
		vault: {
			configDir: "mock-config",
			adapter: {
				exists: vi.fn().mockResolvedValue(false),
				read: vi.fn().mockResolvedValue("{}"),
				write: vi.fn().mockResolvedValue(undefined),
			},
		},
	};
}

describe("FileStateManager", () => {
	let manager: FileStateManager;
	let mockApp: ReturnType<typeof createMockApp>;

	beforeEach(() => {
		mockApp = createMockApp();
		manager = new FileStateManager(
			mockApp as never,
			`${mockApp.vault.configDir}/plugins/test`,
		);
		vi.spyOn(console, "debug").mockImplementation(() => {});
		vi.spyOn(console, "warn").mockImplementation(() => {});
		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	describe("markAsDirty()", () => {
		it("marca arquivo como pending", () => {
			manager.markAsDirty("notes/test.md");

			const state = manager.getState("notes/test.md");
			expect(state).toBeDefined();
			expect(state!.status).toBe("pending");
		});

		it("ignora arquivos ~syncthing~", () => {
			manager.markAsDirty("notes/~syncthing~test.md.tmp");

			const pending = manager.getPendingFiles();
			expect(pending).toHaveLength(0);
		});

		it("ignora arquivos .tmp", () => {
			manager.markAsDirty("notes/test.md.tmp");

			const pending = manager.getPendingFiles();
			expect(pending).toHaveLength(0);
		});

		it("normaliza barras \\ para /", () => {
			manager.markAsDirty("notes\\subfolder\\test.md");

			const state = manager.getState("notes/subfolder/test.md");
			expect(state).toBeDefined();
			expect(state!.path).toBe("notes/subfolder/test.md");
		});
	});

	describe("markAsSynced()", () => {
		it("marca como synced via path exato", () => {
			manager.markAsDirty("notes/test.md");
			manager.markAsSynced("notes/test.md");

			const state = manager.getState("notes/test.md");
			expect(state!.status).toBe("synced");
		});

		it("resolve path com prefixo (match por sufixo)", () => {
			manager.markAsDirty("notes/test.md");
			manager.markAsSynced("dev-obsidian/notes/test.md");

			const state = manager.getState("notes/test.md");
			expect(state!.status).toBe("synced");
		});
	});

	describe("findMatchingKey (via getState)", () => {
		it("retorna undefined para path inexistente", () => {
			const state = manager.getState("nonexistent.md");
			expect(state).toBeUndefined();
		});
	});

	describe("getPendingFiles()", () => {
		it("retorna apenas pendentes", () => {
			manager.markAsDirty("a.md");
			manager.markAsDirty("b.md");
			manager.markAsDirty("c.md");
			manager.markAsSynced("b.md");

			const pending = manager.getPendingFiles();
			expect(pending).toHaveLength(2);
			expect(pending.map((f) => f.path)).toContain("a.md");
			expect(pending.map((f) => f.path)).toContain("c.md");
		});
	});

	describe("Garbage Collection", () => {
		it("remove synced antigos (TTL expirado)", async () => {
			manager.markAsDirty("old.md");
			manager.markAsSynced("old.md");

			// Força lastSyncCheck para o passado (25h atrás)
			const state = manager.getState("old.md");
			if (state) {
				state.lastSyncCheck = Date.now() - 25 * 60 * 60 * 1000;
			}

			// Dispara GC via saveImmediate (que chama performGarbageCollection)
			mockApp.vault.adapter.write.mockResolvedValue(undefined);
			// Chamamos requestSave que no mock executa imediatamente (debounce mockado)
			manager.requestSave();

			// Aguarda o debounce resolver
			await new Promise((resolve) => setTimeout(resolve, 50));

			const stateAfterGC = manager.getState("old.md");
			expect(stateAfterGC).toBeUndefined();
		});

		it("mantém máximo de 50 synced, mais recentes", () => {
			// Cria 60 arquivos synced
			for (let i = 0; i < 60; i++) {
				manager.markAsDirty(`file-${i}.md`);
				manager.markAsSynced(`file-${i}.md`);
			}

			// Força GC via save
			mockApp.vault.adapter.write.mockResolvedValue(undefined);
			manager.requestSave();

			// Conta quantos synced restam
			let syncedCount = 0;
			for (let i = 0; i < 60; i++) {
				if (manager.getState(`file-${i}.md`)) {
					syncedCount++;
				}
			}

			expect(syncedCount).toBeLessThanOrEqual(50);
		});
	});
});
