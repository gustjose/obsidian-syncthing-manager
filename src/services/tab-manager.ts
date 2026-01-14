import { App, WorkspaceLeaf, setIcon, TFile, FileView } from "obsidian";
import SyncthingController from "../main";

interface InternalWorkspaceLeaf extends WorkspaceLeaf {
	tabHeaderInnerEl?: HTMLElement;
	tabHeaderEl?: HTMLElement;
}

// Definimos os estados possíveis
type SyncState = "pending" | "success";

export class TabManager {
	app: App;
	plugin: SyncthingController;
	private pendingFiles: Set<string> = new Set();

	// Atualizado para receber o plugin (acesso às configs)
	constructor(app: App, plugin: SyncthingController) {
		this.app = app;
		this.plugin = plugin;
	}

	public setPendingSync(file: TFile) {
		if (!file) return;
		this.pendingFiles.add(file.path);
		// Define como 'pending' (Laranja + Rotação)
		this.updateTabsForFile(file.path, "pending");
	}

	public setSynced(filenameOrPath: string) {
		const normalizedIncoming = filenameOrPath.replace(/\\/g, "/");

		if (this.pendingFiles.has(normalizedIncoming)) {
			this.pendingFiles.delete(normalizedIncoming);
			// Define como 'success' (Verde + Check)
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
				// Define como 'success' (Verde + Check)
				this.updateTabsForFile(storedPath, "success");
			}
		}
	}

	// Método para limpar ícones quando a config for desativada
	public clearAllIcons() {
		this.pendingFiles.clear();
		this.app.workspace.iterateAllLeaves((leaf) => {
			if (leaf.view instanceof FileView) {
				this.removeIconFromLeaf(leaf);
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
		// 1. Verificação de Configuração
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
					".workspace-tab-header-inner"
				) as HTMLElement;
			}
		}

		if (!headerInner) return;

		let iconContainer =
			headerInner.querySelector<HTMLElement>(".st-tab-sync-icon");

		// Se não existir ícone, cria
		if (!iconContainer) {
			iconContainer = headerInner.createSpan({
				cls: "st-tab-sync-icon",
			});
			setIcon(iconContainer, "refresh-cw");
			// Prepend garante que fique antes do título
			headerInner.prepend(iconContainer);
		}

		// LÓGICA DE ESTADOS
		if (status === "pending") {
			// Configura para Laranja e Rotação
			iconContainer.removeClass("st-sync-success");
			iconContainer.addClass("st-sync-pending");

			// Adiciona animação de rotação
			iconContainer.addClass("st-anim-spin");

			// Garante ícone de refresh
			setIcon(iconContainer, "refresh-cw");
			iconContainer.setAttribute("aria-label", "Sincronizando...");
		} else if (status === "success") {
			// Configura para Verde
			iconContainer.removeClass("st-sync-pending");
			iconContainer.addClass("st-sync-success");

			// Remove animação de rotação (para o check ficar parado)
			iconContainer.removeClass("st-anim-spin");

			// Muda para um checkmark
			setIcon(iconContainer, "check");
			iconContainer.setAttribute("aria-label", "Sincronizado!");

			// Agenda o desaparecimento após 3 segundos
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

	// Helper para remover ícone limpo
	private removeIconFromLeaf(leaf: WorkspaceLeaf) {
		const internalLeaf = leaf as InternalWorkspaceLeaf;
		let headerInner = internalLeaf.tabHeaderInnerEl;

		if (!headerInner) {
			const header = internalLeaf.tabHeaderEl;
			if (header) {
				headerInner = header.querySelector(
					".workspace-tab-header-inner"
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
