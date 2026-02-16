import { App, Modal, Setting, Notice } from "obsidian";
import SyncthingController from "../main";
import { SyncthingAPI, SyncthingVersioning } from "../api/syncthing-api";
import { t } from "../lang/lang";
import { Logger, LOG_MODULES } from "../utils/logger";

export class VersioningModal extends Modal {
	plugin: SyncthingController;
	folderId: string;
	currentVersioning: SyncthingVersioning = { type: "", params: {} };

	constructor(app: App, plugin: SyncthingController, folderId: string) {
		super(app);
		this.plugin = plugin;
		this.folderId = folderId;
	}

	async onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl("h2", { text: t("modal_versioning_title") });

		contentEl.createEl("div", {
			text: "Loading configuration...",
			cls: "st-loading-indicator",
		});

		try {
			const folders = await SyncthingAPI.getFolders(
				this.plugin.apiUrl,
				this.plugin.settings.syncthingApiKey,
			);
			const folder = folders.find((f) => f.id === this.folderId);

			if (!folder) {
				new Notice("Folder not found in configuration.");
				this.close();
				return;
			}

			this.currentVersioning = folder.versioning || {
				type: "",
				params: {},
			};
			this.renderForm();
		} catch (error) {
			new Notice("Failed to load versioning configuration.");
			Logger.error(
				LOG_MODULES.MAIN,
				"Failed to load versioning config",
				error,
			);
			this.close();
		}
	}

	renderForm() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl("h2", { text: t("modal_versioning_title") });

		// Type Selection
		new Setting(contentEl)
			.setName(t("versioning_type"))
			.setDesc(t("versioning_type_desc"))
			.addDropdown((dropdown) => {
				dropdown
					.addOption("", t("versioning_none"))
					.addOption("trashcan", t("versioning_trashcan"))
					.addOption("simple", t("versioning_simple"))
					.addOption("staggered", t("versioning_staggered"))
					.addOption("external", t("versioning_external"))
					.setValue(this.currentVersioning.type)
					.onChange((value) => {
						this.currentVersioning.type =
							value as SyncthingVersioning["type"];
						// Reset params when type changes to avoid invalid keys
						this.currentVersioning.params = {};
						this.renderForm(); // Re-render to show appropriate params
					});
			});

		// Dynamic Params
		if (this.currentVersioning.type === "trashcan") {
			new Setting(contentEl)
				.setName(t("versioning_cleanout_days"))
				.setDesc(t("versioning_cleanout_days_desc"))
				.addText((text) =>
					text
						.setValue(
							this.currentVersioning.params["cleanoutDays"] ||
								"0",
						)
						.onChange((value) => {
							this.currentVersioning.params["cleanoutDays"] =
								value;
						}),
				);
		} else if (this.currentVersioning.type === "simple") {
			new Setting(contentEl)
				.setName(t("versioning_keep"))
				.setDesc(t("versioning_keep_desc"))
				.addText((text) =>
					text
						.setValue(this.currentVersioning.params["keep"] || "5")
						.onChange((value) => {
							this.currentVersioning.params["keep"] = value;
						}),
				);
			new Setting(contentEl)
				.setName(t("versioning_cleanout_days")) // Recycling translation
				.setDesc(t("versioning_cleanout_days_desc"))
				.addText((text) =>
					text
						.setValue(
							this.currentVersioning.params["cleanoutDays"] || "0",
						)
						.onChange((value) => {
							this.currentVersioning.params["cleanoutDays"] =
								value;
						}),
				);
		} else if (this.currentVersioning.type === "staggered") {
			new Setting(contentEl)
				.setName(t("versioning_max_age"))
				.setDesc(t("versioning_max_age_desc"))
				.addText((text) =>
					text
						.setValue(
							this.currentVersioning.params["maxAge"] || "365",
						) // Days
						.onChange((value) => {
							this.currentVersioning.params["maxAge"] = value;
						}),
				);
			new Setting(contentEl)
				.setName(t("versioning_clean_interval"))
				.setDesc(t("versioning_clean_interval_desc"))
				.addText((text) =>
					text
						.setValue(
							this.currentVersioning.params["cleanInterval"] ||
								"3600",
						) // Seconds
						.onChange((value) => {
							this.currentVersioning.params["cleanInterval"] =
								value;
						}),
				);
		} else if (this.currentVersioning.type === "external") {
			new Setting(contentEl)
				.setName(t("versioning_command"))
				.setDesc(t("versioning_command_desc"))
				.addText((text) =>
					text
						.setValue(
							this.currentVersioning.params["command"] || "",
						)
						.onChange((value) => {
							this.currentVersioning.params["command"] = value;
						}),
				);
		}

		// Save Button
		new Setting(contentEl).addButton((btn) =>
			btn
				.setButtonText(t("btn_save"))
				.setCta()
				.onClick(async () => {
					try {
						btn.setButtonText("Saving...").setDisabled(true);
						await SyncthingAPI.setFolderVersioning(
							this.plugin.apiUrl,
							this.plugin.settings.syncthingApiKey,
							this.folderId,
							this.currentVersioning,
						);
						new Notice(t("notice_versioning_saved"));
						this.close();
					} catch (error) {
						new Notice(t("notice_versioning_error"));
						Logger.error(
							LOG_MODULES.MAIN,
							"Failed to save versioning config",
							error,
						);
						btn.setButtonText(t("btn_save")).setDisabled(false);
					}
				}),
		);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
