import { App, Modal, TFile, ButtonComponent, Notice } from "obsidian";
import { ConflictManager, ConflictFile } from "../services/conflict-manager";
import { t } from "../lang/lang";
import { MergeView } from "@codemirror/merge";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

export class ConflictModal extends Modal {
	manager: ConflictManager;
	conflicts: ConflictFile[];
	onCloseCallback: () => void;

	constructor(
		app: App,
		manager: ConflictManager,
		onCloseCallback: () => void,
	) {
		super(app);
		this.manager = manager;
		this.onCloseCallback = onCloseCallback;
		this.conflicts = manager.getConflicts();
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		this.modalEl.addClass("st-modal-wide");

		contentEl.createEl("h2", {
			text: `${t("modal_conflict_title")} (${this.conflicts.length})`,
		});

		if (this.conflicts.length === 0) {
			contentEl.createEl("p", { text: t("modal_conflict_empty") });
			return;
		}

		contentEl.createEl("p", { text: t("modal_conflict_desc") });

		this.conflicts.forEach((conflict) => {
			const container = contentEl.createDiv({ cls: "conflict-item-box" });

			container.createEl("h4", {
				text: conflict.baseName,
				cls: "st-conflict-title",
			});

			container.createEl("div", {
				text: `Data: ${conflict.date}`,
				cls: "conflict-meta",
			});
			container.createEl("div", {
				text: conflict.path,
				cls: "conflict-meta-path",
			});

			const previewContainer = container.createDiv();
			const actionsContainer = container.createDiv({
				cls: "conflict-actions",
			});

			new ButtonComponent(actionsContainer)
				.setButtonText(t("btn_compare"))
				.setIcon("eye")
				.onClick(async () => {
					if (previewContainer.hasChildNodes()) {
						previewContainer.empty();
						return;
					}
					await this.renderContentPreview(previewContainer, conflict);
				});
		});
	}

	async renderContentPreview(container: HTMLElement, conflict: ConflictFile) {
		container.empty();

		const loadingEl = container.createEl("div", {
			text: t("diff_loading"),
			cls: "st-diff-loading",
		});
		let originalText = "";
		let conflictText = "";

		try {
			conflictText = await this.app.vault.read(conflict.file);

			const originalPath = conflict.path.replace(
				conflict.file.name,
				conflict.baseName,
			);
			const originalFile =
				this.app.vault.getAbstractFileByPath(originalPath);

			if (originalFile instanceof TFile) {
				originalText = await this.app.vault.read(originalFile);
			} else {
				originalText = t("diff_original_missing");
			}
		} catch (error) {
			console.error(error);
			loadingEl.setText(t("diff_read_error"));
			return;
		}

		loadingEl.remove();

		// 1. Instructions
		container.createEl("p", {
			text: t("diff_instructions"),
			cls: "st-diff-instructions",
		});

		// 2. Headers and Keep Buttons
		const headersContainer = container.createDiv({
			cls: "st-diff-headers",
		});

		const leftHeader = headersContainer.createDiv({
			cls: "st-diff-header-box",
		});
		const leftBtn = new ButtonComponent(leftHeader)
			.setButtonText(t("btn_use_this_version"))
			.setTooltip(t("tooltip_keep_original"))
			.onClick(() => {
				this.manager
					.deleteConflict(conflict)
					.then(() => this.refresh())
					.catch(console.error);
			});
		leftBtn.buttonEl.addClass("st-btn-accent");

		const rightHeader = headersContainer.createDiv({
			cls: "st-diff-header-box",
		});
		const rightBtn = new ButtonComponent(rightHeader)
			.setButtonText(t("btn_use_this_version"))
			.setTooltip(t("tooltip_keep_conflict"))
			.onClick(() => {
				this.manager
					.acceptConflict(conflict)
					.then(() => this.refresh())
					.catch(console.error);
			});
		rightBtn.buttonEl.addClass("st-btn-accent");

		// 3. Diff View Wrapper
		const diffWrapper = container.createDiv({
			cls: "st-diff-view-wrapper",
		});

		const mergeView = new MergeView({
			a: {
				doc: originalText,
				extensions: [EditorView.lineWrapping],
			},
			b: {
				doc: conflictText,
				extensions: [
					EditorView.lineWrapping,
					EditorState.readOnly.of(true),
				],
			},
			parent: diffWrapper,
			revertControls: "b-to-a", // Permite puxar alterações do Conflito para o Original
		});

		// 4. Save Merge Control
		const diffControlsContainer = container.createDiv({
			cls: "st-diff-controls",
		});

		diffControlsContainer.createEl("span", {
			text: t("diff_legend"),
			cls: "st-diff-legend",
		});

		diffControlsContainer.createSpan({ cls: "st-flex-grow" });

		const saveMergeBtn = new ButtonComponent(diffControlsContainer)
			.setButtonText(t("btn_save_merge"))
			.setTooltip(
				"Sobrescrever original com estado atual da esquerda e remover o conflito",
			)
			.setCta();

		saveMergeBtn.onClick(async () => {
			const mergedText = mergeView.a.state.doc.toString();
			const originalPath = conflict.path.replace(
				conflict.file.name,
				conflict.baseName,
			);
			const originalFile =
				this.app.vault.getAbstractFileByPath(originalPath);

			try {
				if (originalFile instanceof TFile) {
					await this.app.vault.modify(originalFile, mergedText);
					await this.manager.deleteConflict(conflict);
					new Notice(`Merge salvo: ${conflict.baseName}`);
					this.refresh();
				}
			} catch (e) {
				console.error(e);
				new Notice("Erro ao salvar arquivo merged.");
			}
		});
	}

	refresh() {
		this.conflicts = this.manager.getConflicts();
		this.onOpen();
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
		this.onCloseCallback();
	}
}
