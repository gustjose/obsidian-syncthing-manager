import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { requestUrl } from "obsidian";
import { SyncthingEventMonitor } from "../src/services/event-monitor";
import SyncthingController from "../src/main";

// Mocks
vi.mock("obsidian", () => ({
	requestUrl: vi.fn(),
	Notice: vi.fn(),
	App: vi.fn(),
	Plugin: vi.fn(),
}));

describe("SyncthingEventMonitor Timeout", () => {
	let monitor: SyncthingEventMonitor;
	let mockPlugin: unknown;

	beforeEach(() => {
		// Fake timers are essential to fast-forward 90 seconds instantly without making the test wait.
		vi.useFakeTimers();
		vi.clearAllMocks();

		mockPlugin = {
			apiUrl: "http://localhost:8384",
			settings: {
				syncthingApiKey: "test-key-123",
			},
		};

		monitor = new SyncthingEventMonitor(mockPlugin as SyncthingController);
	});

	afterEach(() => {
		monitor.stop();
		vi.useRealTimers();
	});

	it("should abort zombie requests exactly after 90 seconds (90000ms)", async () => {
		// Fazemos o requestUrl simular uma conexão travada (pendente) que não resolve nem rejeita
		(requestUrl as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
			new Promise(() => {}), // Retorna uma Promise que nunca se conclui
		);

		// Ignora o setTimeout inicial do event-monitor para buscar o ID. Injetamos um loop artificial.
		monitor.running = true;

		// Dispara a iteração 1x manualmente
		// Utilizamos uma promise intermediária pois a função loop() roda em background
		// @ts-ignore (Acessando método privado para teste unitário)
		void monitor.loop();

		// Avançamos o tempo em 89 segundos.
		// A requisição aidna deve estar travada e o abortController.signal não acionado!
		await vi.advanceTimersByTimeAsync(89000);

		// @ts-ignore
		const controller = monitor.abortController;
		expect(controller).toBeDefined();
		expect(controller?.signal.aborted).toBe(false);

		// Avançamos o tempo para passar a barreira dos 90 segundos (+1 segundo).
		await vi.advanceTimersByTimeAsync(1100);

		// O setTimeout lá do event-monitor.ts deve ter acordado e chamado abortController.abort()
		expect(controller?.signal.aborted).toBe(true);

		// Para não deixar o loop pendurado para sempre no vitest, mandamos parar.
		monitor.stop();
	});
});
