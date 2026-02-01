import { App, WorkspaceLeaf, setIcon, TFile, FileView } from "obsidian";
import SyncthingController from "../main";

interface InternalWorkspaceLeaf extends WorkspaceLeaf {
	tabHeaderInnerEl?: HTMLElement;
	tabHeaderEl?: HTMLElement;
}

type SyncState = "pending" | "success";

export class TabManager {
	app: App;
	plugin: SyncthingController;

	constructor(app: App, plugin: SyncthingController) {
		this.app = app;
		this.plugin = plugin;
		this.setupListeners();
	}

	private setupListeners() {
		// 1. Ao abrir/focar um arquivo
		this.plugin.registerEvent(
			this.app.workspace.on("file-open", (file) => {
				this.cleanupStaleIcons();

				// [NOVO] Verifica se o arquivo aberto está pendente e restaura o ícone
				if (file instanceof TFile) {
					const state = this.plugin.fileStateManager.getState(
						file.path,
					);
					if (state && state.status === "pending") {
						this.updateTabsForFile(file.path, "pending");
					}
				}
			}),
		);

		// 2. [NOVO] Ao mudar o layout (ex: dividir janelas, restaurar sessão)
		this.plugin.registerEvent(
			this.app.workspace.on("layout-change", () => {
				// Re-aplica ícones em todos os arquivos pendentes visíveis
				const pendingFiles =
					this.plugin.fileStateManager.getPendingFiles();
				pendingFiles.forEach((fileState) => {
					this.updateTabsForFile(fileState.path, "pending");
				});
			}),
		);
	}

	public setPendingSync(file: TFile) {
		if (!file) return;
		this.updateTabsForFile(file.path, "pending");
	}

	public setSynced(filenameOrPath: string) {
		const state = this.plugin.fileStateManager.getState(filenameOrPath);
		const targetPath = state
			? state.path
			: filenameOrPath.replace(/\\/g, "/");

		this.updateTabsForFile(targetPath, "success");
	}

	public clearAllIcons() {
		this.app.workspace.iterateAllLeaves((leaf) => {
			if (leaf.view instanceof FileView) {
				this.removeIconFromLeaf(leaf);
			}
		});
	}

	private cleanupStaleIcons() {
		this.app.workspace.iterateAllLeaves((leaf) => {
			if (leaf.view instanceof FileView) {
				const viewFile = leaf.view.file;
				const internalLeaf = leaf as InternalWorkspaceLeaf;

				let headerInner = internalLeaf.tabHeaderInnerEl;
				if (!headerInner && internalLeaf.tabHeaderEl) {
					headerInner = internalLeaf.tabHeaderEl.querySelector(
						".workspace-tab-header-inner",
					) as HTMLElement;
				}

				if (headerInner) {
					const iconContainer =
						headerInner.querySelector(".st-tab-sync-icon");

					if (
						iconContainer &&
						iconContainer.hasClass("st-sync-pending")
					) {
						if (!viewFile) {
							iconContainer.remove();
							return;
						}

						const state = this.plugin.fileStateManager.getState(
							viewFile.path,
						);
						if (!state || state.status !== "pending") {
							iconContainer.remove();
						}
					}
				}
			}
		});
	}

	private updateTabsForFile(path: string, status: SyncState) {
		this.app.workspace.iterateAllLeaves((leaf) => {
			if (leaf.view instanceof FileView) {
				const viewFile = leaf.view.file;

				if (viewFile && viewFile.path === path) {
					this.injectIconToLeaf(leaf, status);
				}
			}
		});
	}

	private injectIconToLeaf(leaf: WorkspaceLeaf, status: SyncState) {
		if (!this.plugin.settings.showTabIcon) {
			this.removeIconFromLeaf(leaf);
			return;
		}

		const internalLeaf = leaf as InternalWorkspaceLeaf;
		let headerInner = internalLeaf.tabHeaderInnerEl;

		if (!headerInner) {
			const header = internalLeaf.tabHeaderEl;
			if (header) {
				headerInner = header.querySelector(
					".workspace-tab-header-inner",
				) as HTMLElement;
			}
		}

		if (!headerInner) return;

		let iconContainer =
			headerInner.querySelector<HTMLElement>(".st-tab-sync-icon");

		if (!iconContainer) {
			iconContainer = headerInner.createSpan({
				cls: "st-tab-sync-icon",
			});
			headerInner.prepend(iconContainer);
		}

		if (status === "pending") {
			iconContainer.removeClass("st-sync-success");
			iconContainer.addClass("st-sync-pending");
			iconContainer.addClass("st-anim-spin");
			setIcon(iconContainer, "refresh-cw");
			iconContainer.setAttribute("aria-label", "Sincronizando...");
		} else if (status === "success") {
			iconContainer.removeClass("st-sync-pending");
			iconContainer.addClass("st-sync-success");
			iconContainer.removeClass("st-anim-spin");
			setIcon(iconContainer, "check");
			iconContainer.setAttribute("aria-label", "Sincronizado!");

			setTimeout(() => {
				if (
					iconContainer &&
					iconContainer.hasClass("st-sync-success")
				) {
					iconContainer.remove();
				}
			}, 3000);
		}
	}

	private removeIconFromLeaf(leaf: WorkspaceLeaf) {
		const internalLeaf = leaf as InternalWorkspaceLeaf;
		let headerInner = internalLeaf.tabHeaderInnerEl;

		if (!headerInner) {
			const header = internalLeaf.tabHeaderEl;
			if (header) {
				headerInner = header.querySelector(
					".workspace-tab-header-inner",
				) as HTMLElement;
			}
		}

		if (headerInner) {
			const iconContainer =
				headerInner.querySelector(".st-tab-sync-icon");
			if (iconContainer) {
				iconContainer.remove();
			}
		}
	}
}
