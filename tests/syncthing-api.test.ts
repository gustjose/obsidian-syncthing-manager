import { describe, it, expect, beforeEach, vi } from "vitest";
import { SyncthingAPI } from "../src/api/syncthing-api";
import { requestUrl } from "obsidian";

const mockRequestUrl = requestUrl as ReturnType<typeof vi.fn>;

const BASE_URL = "http://127.0.0.1:8384";
const API_KEY = "test-api-key-123";

/** Helper para criar resposta mock no formato que SyncthingAPI.request() espera. */
function mockResponse(status: number, data: unknown) {
	const text = JSON.stringify(data);
	return { status, json: data, text };
}

describe("SyncthingAPI", () => {
	beforeEach(() => {
		mockRequestUrl.mockReset();
		SyncthingAPI.invalidateConfigCache();
		vi.spyOn(console, "debug").mockImplementation(() => {});
		vi.spyOn(console, "warn").mockImplementation(() => {});
		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	describe("getStatus()", () => {
		it("faz GET com header X-API-Key correto", async () => {
			mockRequestUrl.mockResolvedValue(
				mockResponse(200, {
					myID: "device-123",
					alloc: 100,
					cpuPerf: 50,
				}),
			);

			const result = await SyncthingAPI.getStatus(BASE_URL, API_KEY);

			expect(mockRequestUrl).toHaveBeenCalled();
			const callArg = mockRequestUrl.mock.calls[0][0] as {
				url: string;
				method: string;
				headers: Record<string, string>;
			};
			expect(callArg.url).toBe(`${BASE_URL}/rest/system/status`);
			expect(callArg.method).toBe("GET");
			expect(callArg.headers["X-API-Key"]).toBe(API_KEY);

			expect(result.myID).toBe("device-123");
		});
	});

	describe("getConfig() — cache", () => {
		it("usa cache dentro do TTL", async () => {
			const configData = {
				folders: [{ id: "f1", label: "Test" }],
				devices: [],
			};
			mockRequestUrl.mockResolvedValue(mockResponse(200, configData));

			await SyncthingAPI.getConfig(BASE_URL, API_KEY);
			await SyncthingAPI.getConfig(BASE_URL, API_KEY);

			expect(mockRequestUrl).toHaveBeenCalledTimes(1);
		});

		it("invalida cache após invalidateConfigCache()", async () => {
			const configData = { folders: [], devices: [] };
			mockRequestUrl.mockResolvedValue(mockResponse(200, configData));

			await SyncthingAPI.getConfig(BASE_URL, API_KEY);
			SyncthingAPI.invalidateConfigCache();
			await SyncthingAPI.getConfig(BASE_URL, API_KEY);

			expect(mockRequestUrl).toHaveBeenCalledTimes(2);
		});
	});

	describe("getFolders()", () => {
		it("extrai folders do config", async () => {
			mockRequestUrl.mockResolvedValue(
				mockResponse(200, {
					folders: [
						{ id: "f1", label: "Folder 1" },
						{ id: "f2", label: "Folder 2" },
					],
					devices: [],
				}),
			);

			const folders = await SyncthingAPI.getFolders(BASE_URL, API_KEY);

			expect(folders).toHaveLength(2);
			expect(folders[0].id).toBe("f1");
		});
	});

	describe("forceScan()", () => {
		it("faz POST com folderId no query", async () => {
			mockRequestUrl.mockResolvedValue(mockResponse(200, {}));

			await SyncthingAPI.forceScan(BASE_URL, API_KEY, "my-folder");

			expect(mockRequestUrl).toHaveBeenCalled();
			const callArg = mockRequestUrl.mock.calls[0][0] as {
				url: string;
				method: string;
			};
			expect(callArg.method).toBe("POST");
			expect(callArg.url).toContain("folder=my-folder");
		});
	});

	describe("request() — tratamento de erros", () => {
		it("lança erro em status 403", async () => {
			mockRequestUrl.mockResolvedValue(
				mockResponse(403, { error: "Forbidden" }),
			);

			await expect(
				SyncthingAPI.getStatus(BASE_URL, API_KEY),
			).rejects.toThrow("HTTP Error 403");
		});

		it("lança erro em falha de conexão", async () => {
			mockRequestUrl.mockRejectedValue(
				new Error("net::ERR_CONNECTION_REFUSED"),
			);

			await expect(
				SyncthingAPI.getStatus(BASE_URL, API_KEY),
			).rejects.toThrow("ERR_CONNECTION_REFUSED");
		});

		it("permite status em allowErrors sem impedir a execução", async () => {
			mockRequestUrl.mockResolvedValue(mockResponse(404, null));

			const result = await SyncthingAPI.getFileInfo(
				BASE_URL,
				API_KEY,
				"folder-id",
				"nonexistent.md",
			);

			expect(result).toBeNull();
		});
	});

	describe("getHistory()", () => {
		it("filtra e mapeia eventos corretamente", async () => {
			const events = [
				{
					id: 1,
					type: "ItemFinished",
					time: "2026-01-01T00:00:00Z",
					data: {
						item: "test.md",
						type: "file",
						action: "update",
						folder: "my-folder",
					},
				},
				{
					id: 2,
					type: "ItemFinished",
					time: "2026-01-01T00:01:00Z",
					data: {
						item: "other.md",
						type: "file",
						action: "delete",
						folder: "my-folder",
					},
				},
			];
			mockRequestUrl.mockResolvedValue(mockResponse(200, events));

			const history = await SyncthingAPI.getHistory(
				BASE_URL,
				API_KEY,
				"my-folder",
				"",
				"device-123",
			);

			expect(history).toHaveLength(2);
			expect(history[0].filename).toBe("other.md");
			expect(history[0].action).toBe("deleted");
			expect(history[1].filename).toBe("test.md");
			expect(history[1].action).toBe("updated");
		});
	});
});
