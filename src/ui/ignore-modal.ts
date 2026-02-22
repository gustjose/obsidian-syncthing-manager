import {
	App,
	Modal,
	Setting,
	Notice,
	TextAreaComponent,
	ButtonComponent,
} from "obsidian";
import { IgnoreManager } from "../services/ignore-manager";
import SyncthingController from "../main";
import { t } from "../lang/lang";
import { Logger, LOG_MODULES } from "../utils/logger";

export class IgnoreModal extends Modal {
	plugin: SyncthingController;
	manager: IgnoreManager;
	content: string = "";

	constructor(app: App, plugin: SyncthingController) {
		super(app);
		this.plugin = plugin;
		this.manager = new IgnoreManager(app, plugin);
	}

	async onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		this.modalEl.addClass("st-modal-wide");

		contentEl.createEl("h2", { text: t("modal_ignore_title") });
		contentEl.createEl("p", { text: t("modal_ignore_desc") });

		// [MODIFICADO] Usa o método da API
		try {
			this.content = await this.manager.loadRules();
		} catch (e) {
			this.content = "";
			new Notice("Erro ao carregar regras da API");
			Logger.debug(LOG_MODULES.MAIN, `Erro: ${e}.`);
		}

		const container = contentEl.createDiv();

		const textArea = new TextAreaComponent(container);
		textArea.inputEl.addClass("st-textarea-code");
		textArea.setValue(this.content);

		textArea.onChange((value) => {
			this.content = value;
		});

		container.createEl("br");

		const details = container.createDiv({ cls: "st-details-box" });
		const detailsElem = details.createEl("details");

		const summary = detailsElem.createEl("summary", {
			cls: "st-summary-title",
		});
		summary.setText(t("header_ignore_templates"));

		const suggestionsContainer = detailsElem.createDiv({
			cls: "st-details-content",
		});

		suggestionsContainer.createEl("p", {
			text: t("ignore_help_text"),
			cls: "setting-item-description",
			attr: { style: "margin-bottom: 15px; margin-top: 0;" },
		});

		const configDir = this.app.vault.configDir;

		const patterns = [
			{
				label: t("ignore_pattern_workspace_label"),
				rule: `${configDir}/workspace*`,
				desc: t("ignore_pattern_workspace_desc"),
			},
			{
				label: t("ignore_pattern_installer_label"),
				rule: `${configDir}/installer.json`,
				desc: t("ignore_pattern_installer_desc"),
			},
			{
				label: t("ignore_pattern_hidden_label"),
				rule: ".*",
				desc: t("ignore_pattern_hidden_desc"),
			},
		];

		patterns.forEach((p) => {
			const settingDiv = suggestionsContainer.createDiv();
			const setting = new Setting(settingDiv)
				.setName(p.label)
				.setDesc(p.desc);

			setting.descEl.createEl("code", {
				text: ` (${p.rule})`,
				cls: "st-code-badge",
			});

			setting.addButton((btn) =>
				btn
					.setButtonText(t("btn_add_ignore"))
					.setIcon("plus")
					.onClick(() => {
						if (!this.content.includes(p.rule)) {
							const prefix =
								this.content.trim().length > 0 ? "\n" : "";
							this.content =
								this.content.trim() + prefix + p.rule;
							textArea.setValue(this.content);
							new Notice(t("notice_ignore_added") + p.label);
						} else {
							new Notice(t("notice_ignore_exists"));
						}
					}),
			);
		});

		const footer = contentEl.createDiv({ cls: "st-modal-footer" });

		new ButtonComponent(footer)
			.setButtonText(t("btn_save_ignore"))
			.setCta()
			.onClick(() => {
				// [MODIFICADO] Usa o método da API (saveRules)
				this.manager
					.saveRules(this.content)
					.then(() => {
						new Notice(t("notice_ignore_saved"));
						this.close();
					})
					.catch((err) => {
						Logger.error(
							LOG_MODULES.MAIN,
							"Erro ao salvar .stignore",
							err,
						);
						new Notice(t("notice_ignore_error"));
					});
			});
	}

	onClose() {
		this.contentEl.empty();
	}
}
