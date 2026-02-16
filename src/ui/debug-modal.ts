import { App, Modal, Setting } from "obsidian";
import SyncthingController from "../main";
import { LOG_MODULES, Logger } from "../utils/logger";
import { t } from "../lang/lang";

export class DebugModal extends Modal {
	plugin: SyncthingController;

	constructor(app: App, plugin: SyncthingController) {
		super(app);
		this.plugin = plugin;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl("h2", { text: t("modal_debug_title") });
		contentEl.createEl("p", {
			text: t("modal_debug_desc"),
		});

		const modules = Object.values(LOG_MODULES);
		const currentSettings = new Set(this.plugin.settings.debugModules);

		modules.forEach((moduleName) => {
			new Setting(contentEl).setName(moduleName).addToggle((toggle) => {
				toggle
					.setValue(currentSettings.has(moduleName))
					.onChange(async (value) => {
						if (value) {
							currentSettings.add(moduleName);
						} else {
							currentSettings.delete(moduleName);
						}

						this.plugin.settings.debugModules =
							Array.from(currentSettings);
						await this.plugin.saveSettings();
						Logger.setActiveModules(
							this.plugin.settings.debugModules,
						);
					});
			});
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
