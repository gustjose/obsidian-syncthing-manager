import { App, TFile, setIcon } from "obsidian";
import SyncthingController from "../main";
import { Logger, LOG_MODULES } from "../utils/logger";
import { t } from "../lang/lang";

export class ExplorerManager {
	app: App;
	plugin: SyncthingController;
	observer: MutationObserver | null = null;

	constructor(app: App, plugin: SyncthingController) {
		this.app = app;
		this.plugin = plugin;
	}

	onload() {
		Logger.debug(
			LOG_MODULES.MAIN,
			"[Explorer] Inicializando ExplorerManager...",
		);

		if (this.plugin.settings.showExplorerIcon) {
			this.app.workspace.onLayoutReady(() => {
				this.registerObserver();
				this.refreshAll();
			});
		}

		this.plugin.registerEvent(
			this.app.workspace.on("layout-change", () => {
				if (this.plugin.settings.showExplorerIcon) {
					this.registerObserver();
				}
			}),
		);
	}

	onunload() {
		if (this.observer) this.observer.disconnect();
		document
			.querySelectorAll(".st-explorer-btn")
			.forEach((el) => el.remove());
		Logger.debug(
			LOG_MODULES.MAIN,
			"[Explorer] ExplorerManager descarregado.",
		);
	}

	public start() {
		this.registerObserver();
		this.refreshAll();
	}

	public stop() {
		if (this.observer) this.observer.disconnect();
		document
			.querySelectorAll(".st-explorer-btn")
			.forEach((el) => el.remove());
	}

	private registerObserver() {
		if (this.observer) this.observer.disconnect();

		if (!this.plugin.settings.showExplorerIcon) return;

		const leaves = this.app.workspace.getLeavesOfType("file-explorer");
		if (leaves.length === 0) {
			Logger.debug(
				LOG_MODULES.MAIN,
				"[Explorer] Nenhuma aba de explorador encontrada.",
			);
			return;
		}

		Logger.debug(
			LOG_MODULES.MAIN,
			"[Explorer] Aba de explorador encontrada. Registrando observer.",
		);
		const container = leaves[0].view.containerEl;

		this.observer = new MutationObserver((mutations) => {
			let shouldInject = false;
			mutations.forEach((mutation) => {
				if (mutation.addedNodes.length > 0) {
					shouldInject = true;
				}
			});
			if (shouldInject) {
				// Logger.debug(LOG_MODULES.MAIN, "[Explorer] Mutação detectada. Reinjetando botões...");
				this.injectButtons(container);
			}
		});

		this.observer.observe(container, {
			childList: true,
			subtree: true,
		});

		this.injectButtons(container);
	}

	private refreshAll() {
		const leaves = this.app.workspace.getLeavesOfType("file-explorer");
		if (leaves.length > 0) {
			this.injectButtons(leaves[0].view.containerEl);
		}
	}

	private injectButtons(container: HTMLElement) {
		const items = container.querySelectorAll(".nav-file-title");

		// Log para saber quantos arquivos o plugin está "vendo"
		// Logger.debug(LOG_MODULES.MAIN, `[Explorer] Varrendo ${items.length} itens no explorador.`);

		items.forEach((item) => {
			if (item.querySelector(".st-explorer-btn")) return;

			const path = item.getAttribute("data-path");
			if (!path) return;

			const file = this.app.vault.getAbstractFileByPath(path);
			if (!(file instanceof TFile)) return;

			const btn = item.createDiv({ cls: "st-explorer-btn" });
			setIcon(btn, "refresh-cw");
			btn.setAttribute("aria-label", t("explorer_sync_tooltip"));

			this.plugin.registerDomEvent(btn, "click", async (e) => {
				e.stopPropagation();
				e.preventDefault();

				Logger.debug(
					LOG_MODULES.MAIN,
					`[Explorer] Clique no botão para: ${file.path}`,
				);

				if (btn.hasClass("st-loading")) return;

				btn.addClass("st-loading");

				try {
					await this.plugin.syncSpecificFile(file.path);

					Logger.debug(
						LOG_MODULES.MAIN,
						`[Explorer] Sucesso na sincronização: ${file.path}`,
					);

					btn.removeClass("st-loading");
					btn.addClass("st-success");
					setIcon(btn, "check");

					setTimeout(() => {
						btn.removeClass("st-success");
						setIcon(btn, "refresh-cw");
					}, 2000);
				} catch (error) {
					Logger.error(
						LOG_MODULES.MAIN,
						`[Explorer] Erro ao sincronizar ${file.path}`,
						error,
					);
					btn.removeClass("st-loading");
				}
			});
		});
	}
}
