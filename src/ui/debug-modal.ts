import { App, Modal, Setting } from "obsidian";
import SyncthingController from "../main";
import { LOG_MODULES, Logger } from "../utils/logger";
import { t } from "../lang/lang";
import { DebugConsoleModal } from "./debug-console-modal";

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

		// Dropdown de nível de log
		new Setting(contentEl)
			.setName(t("setting_log_level_name"))
			.setDesc(t("setting_log_level_desc"))
			.addDropdown((dd) => {
				dd.addOption("off", t("log_level_off"));
				dd.addOption("error", t("log_level_error"));
				dd.addOption("warn", t("log_level_warn"));
				dd.addOption("debug", t("log_level_debug"));
				dd.setValue(this.plugin.settings.logLevel);
				dd.onChange(async (value) => {
					const level = value as "off" | "error" | "warn" | "debug";
					this.plugin.settings.logLevel = level;
					await this.plugin.saveSettings();
					Logger.setLogLevel(level);
				});
			});

		// Seleção de módulos
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

		// Botão "Abrir Console"
		new Setting(contentEl)
			.setName(t("btn_open_console"))
			.addButton((btn) => {
				btn.setButtonText(t("btn_open_console"))
					.setCta()
					.onClick(() => {
						this.close();
						new DebugConsoleModal(this.app, this.plugin).open();
					});
			});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
