import { App, Modal, Setting } from "obsidian";
import SyncthingController from "../main";
import { t } from "../lang/lang";

export class ContextMenuModal extends Modal {
	plugin: SyncthingController;

	constructor(app: App, plugin: SyncthingController) {
		super(app);
		this.plugin = plugin;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl("h2", {
			text: t("modal_context_menu_title") || "Manage Context Menu Items",
		});

		const items = [
			{
				id: "view_file_versions",
				label: t("cmd_view_versions") || "View File Versions",
			},
		];

		items.forEach((item) => {
			new Setting(contentEl).setName(item.label).addToggle((toggle) => {
				toggle
					.setValue(
						this.plugin.settings.enabledContextMenuItems.includes(
							item.id,
						),
					)
					.onChange(async (value) => {
						if (value) {
							if (
								!this.plugin.settings.enabledContextMenuItems.includes(
									item.id,
								)
							) {
								this.plugin.settings.enabledContextMenuItems.push(
									item.id,
								);
							}
						} else {
							this.plugin.settings.enabledContextMenuItems =
								this.plugin.settings.enabledContextMenuItems.filter(
									(id) => id !== item.id,
								);
						}
						await this.plugin.saveSettings();
					});
			});
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
