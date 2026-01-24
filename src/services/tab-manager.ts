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
	private pendingFiles: Set<string> = new Set();

	constructor(app: App, plugin: SyncthingController) {
		this.app = app;
		this.plugin = plugin;
		this.setupListeners();
	}

	private setupListeners() {
		this.plugin.registerEvent(
			this.app.workspace.on("file-open", () => {
				this.cleanupStaleIcons();
			}),
		);
	}

	public setPendingSync(file: TFile) {
		if (!file) return;
		this.pendingFiles.add(file.path);
		this.updateTabsForFile(file.path, "pending");
	}

	public setSynced(filenameOrPath: string) {
		const normalizedIncoming = filenameOrPath.replace(/\\/g, "/");

		if (this.pendingFiles.has(normalizedIncoming)) {
			this.pendingFiles.delete(normalizedIncoming);
			this.updateTabsForFile(normalizedIncoming, "success");
			return;
		}

		for (const storedPath of this.pendingFiles) {
			const normalizedStored = storedPath.replace(/\\/g, "/");
			const match =
				normalizedIncoming.endsWith(normalizedStored) ||
				normalizedStored.endsWith(normalizedIncoming);

			if (match) {
				this.pendingFiles.delete(storedPath);
				this.updateTabsForFile(storedPath, "success");
			}
		}
	}

	public clearAllIcons() {
		this.pendingFiles.clear();
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

				// Tenta localizar o cabeçalho
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
						if (
							!viewFile ||
							!this.pendingFiles.has(viewFile.path)
						) {
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

		// LÓGICA DE ESTADOS
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
