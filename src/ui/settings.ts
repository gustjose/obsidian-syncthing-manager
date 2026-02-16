import { App, PluginSettingTab, Setting, Notice } from "obsidian";
import SyncthingController from "../main";
import { SyncthingAPI, SyncthingFolder } from "../api/syncthing-api";
import { t, setLanguage, LANGUAGE_LIST } from "../lang/lang";
import { IgnoreModal } from "./ignore-modal";
import { ContextMenuModal } from "./context-menu-modal";

export class SyncthingSettingTab extends PluginSettingTab {
	plugin: SyncthingController;

	constructor(app: App, plugin: SyncthingController) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// GERAL
		new Setting(containerEl)
			.setName(t("setting_header_general"))
			.setHeading();

		new Setting(containerEl)
			.setName(t("setting_lang_name"))
			.setDesc(t("setting_lang_desc"))
			.addDropdown((dropDown) => {
				LANGUAGE_LIST.forEach((lang) => {
					dropDown.addOption(lang.code, lang.display);
				});

				dropDown.setValue(this.plugin.settings.language);
				dropDown.onChange((value) => {
					void (async () => {
						this.plugin.settings.language = value;
						await this.plugin.saveSettings();
						setLanguage(value);
						this.plugin.atualizarTodosVisuais();
						this.display();
					})();
				});
			});

		// CONEXÃO
		new Setting(containerEl).setName(t("setting_header_conn")).setHeading();

		new Setting(containerEl)
			.setName(t("setting_host_name"))
			.setDesc(t("setting_host_desc"))
			.addText((text) => {
				text.setPlaceholder("127.0.0.1")
					.setValue(this.plugin.settings.syncthingHost)
					.onChange((value) => {
						void (async () => {
							this.plugin.settings.syncthingHost = value;
							await this.plugin.saveSettings();
						})();
					});
				text.inputEl.addClass("st-input-full-width");
			});

		new Setting(containerEl)
			.setName(t("setting_port_name"))
			.setDesc(t("setting_port_desc"))
			.addText((text) => {
				text.setPlaceholder("8384")
					.setValue(this.plugin.settings.syncthingPort)
					.onChange((value) => {
						void (async () => {
							this.plugin.settings.syncthingPort = value;
							await this.plugin.saveSettings();
						})();
					});
				text.inputEl.addClass("st-input-full-width");
			});

		new Setting(containerEl)
			.setName(t("setting_https_name"))
			.setDesc(t("setting_https_desc"))
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.useHttps)
					.onChange((value) => {
						void (async () => {
							this.plugin.settings.useHttps = value;
							await this.plugin.saveSettings();
						})();
					}),
			);

		const api_key_Setting = new Setting(containerEl)
			.setName(t("setting_api_name"))
			.setDesc(t("setting_api_desc"))
			.addText((text) => {
				text.setPlaceholder("...")
					.setValue(this.plugin.settings.syncthingApiKey)
					.onChange((value) => {
						void (async () => {
							this.plugin.settings.syncthingApiKey = value;
							await this.plugin.saveSettings();
						})();
					});
				text.inputEl.type = "password";
				text.inputEl.addClass("st-input-full-width");
			});

		api_key_Setting.addButton((button) =>
			button
				.setButtonText(t("btn_test_conn"))
				.setCta()
				.onClick(() => {
					void (async () => {
						try {
							await this.plugin.testarApiApenas();
						} catch (e) {
							console.error(e);
						}
					})();
				}),
		);

		// PASTA
		new Setting(containerEl)
			.setName(t("setting_header_folder"))
			.setHeading();

		const folderSetting = new Setting(containerEl)
			.setName(t("setting_folder_name"))
			.setDesc(t("setting_folder_desc"));

		// Removido 'async' daqui pois a definição do dropdown deve ser síncrona
		folderSetting.addDropdown((dropdown) => {
			const currentId = this.plugin.settings.syncthingFolderId;
			const display =
				this.plugin.settings.syncthingFolderLabel || t("dropdown_none");
			dropdown.addOption(currentId, display);
			dropdown.setValue(currentId);

			dropdown.onChange((value) => {
				void (async () => {
					this.plugin.settings.syncthingFolderId = value;
					const index = dropdown.selectEl.selectedIndex;
					if (index >= 0) {
						const label = dropdown.selectEl.options[index].text;
						this.plugin.settings.syncthingFolderLabel = label;
					} else {
						this.plugin.settings.syncthingFolderLabel = "";
					}
					await this.plugin.saveSettings();
					await this.plugin.verificarConexao(false);
				})();
			});
		});

		folderSetting.addExtraButton((btn) =>
			btn
				.setIcon("search")
				.setTooltip(t("btn_search_folders"))
				.onClick(() => {
					void (async () => {
						try {
							new Notice(t("notice_searching"));
							const folders = await SyncthingAPI.getFolders(
								this.plugin.apiUrl,
								this.plugin.settings.syncthingApiKey,
							);

							const selectEl =
								folderSetting.controlEl.querySelector("select");
							if (selectEl) selectEl.innerHTML = "";

							const optionDefault =
								document.createElement("option");
							optionDefault.value = "";
							optionDefault.text = t("dropdown_default");
							selectEl?.appendChild(optionDefault);

							folders.forEach((folder: SyncthingFolder) => {
								const option = document.createElement("option");
								option.value = folder.id;
								option.text = folder.label || folder.id;
								option.selected =
									folder.id ===
									this.plugin.settings.syncthingFolderId;
								selectEl?.appendChild(option);
							});

							new Notice(
								`${folders.length} ${t("notice_folders_found")}`,
							);
						} catch (error) {
							new Notice(t("notice_fail_conn"));
							console.error(error);
						}
					})();
				}),
		);

		new Setting(containerEl)
			.setName(t("setting_modal_conflict_name"))
			.setDesc(t("setting_modal_conflict_desc"))
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.modalConflict)
					.onChange((value) => {
						void (async () => {
							this.plugin.settings.modalConflict = value;
							await this.plugin.saveSettings();
						})();
					}),
			);

		new Setting(containerEl)
			.setName(t("setting_ignore_name"))
			.setDesc(t("setting_ignore_desc"))
			.addButton((btn) =>
				btn
					.setButtonText(t("btn_edit_ignore"))
					.setIcon("file-minus")
					.onClick(() => {
						new IgnoreModal(this.app, this.plugin).open();
					}),
			);

		// INTERFACE
		new Setting(containerEl)
			.setName(t("setting_header_interface"))
			.setHeading();

		new Setting(containerEl)
			.setName(t("setting_status_bar_name"))
			.setDesc(t("setting_status_bar_desc"))
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.showStatusBar)
					.onChange((value) => {
						void (async () => {
							this.plugin.settings.showStatusBar = value;
							await this.plugin.saveSettings();
						})();
					}),
			);

		new Setting(containerEl)
			.setName(t("setting_ribbon_name"))
			.setDesc(t("setting_ribbon_desc"))
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.showRibbonIcon)
					.onChange((value) => {
						void (async () => {
							this.plugin.settings.showRibbonIcon = value;
							await this.plugin.saveSettings();
						})();
					}),
			);

		new Setting(containerEl)
			.setName(t("setting_tab_icon_name"))
			.setDesc(t("setting_tab_icon_desc"))
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.showTabIcon)
					.onChange((value) => {
						void (async () => {
							this.plugin.settings.showTabIcon = value;
							await this.plugin.saveSettings();

							// Se desativar, força a limpeza dos ícones atuais
							if (!value) {
								this.plugin.tabManager.clearAllIcons();
							}
						})();
					}),
			);

		new Setting(containerEl)
			.setName(t("setting_history_filter_name"))
			.setDesc(t("setting_history_filter_desc"))
			.addText((text) => {
				const configDir = this.app.vault.configDir;
				text.setPlaceholder(`${configDir}, .DS_Store, desktop.ini`)
					.setValue(this.plugin.settings.ignoredPaths)
					.onChange(async (value) => {
						this.plugin.settings.ignoredPaths = value;
						await this.plugin.saveSettings();
					});
				text.inputEl.addClass("st-input-full-width");
			});

		new Setting(containerEl)
			.setName(t("setting_explorer_icon_name"))
			.setDesc(t("setting_explorer_icon_desc"))
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.showExplorerIcon)
					.onChange((value) => {
						void (async () => {
							this.plugin.settings.showExplorerIcon = value;
							await this.plugin.saveSettings();

							if (value) {
								this.plugin.explorerManager.start();
							} else {
								this.plugin.explorerManager.stop();
							}
						})();
					}),
			);

		new Setting(containerEl)
			.setName(t("modal_context_menu_title"))
			.setDesc(t("btn_manage_context_menu"))
			.addButton((btn) =>
				btn
					.setIcon("list-plus")
					.setTooltip(t("btn_manage_context_menu"))
					.onClick(() => {
						new ContextMenuModal(this.app, this.plugin).open();
					}),
			);

		// --- SEÇÃO SOBRE ---
		new Setting(containerEl)
			.setName(t("setting_header_about"))
			.setHeading();

		const infoContainer = containerEl.createDiv("st-about-info-container");

		// Versão do Plugin
		new Setting(infoContainer)
			.setName(t("setting_version_name"))
			.setDesc(`v${this.plugin.manifest.version}`)
			.addExtraButton((btn) => {
				btn.setIcon("info").setTooltip(t("setting_version_tooltip"));
				btn.onClick(() => {
					window.open(
						`https://github.com/gustjose/obsidian-syncthing-manager/releases/tag/${this.plugin.manifest.version}`,
					);
				});
			});

		// Repositório GitHub
		new Setting(infoContainer)
			.setName("GitHub")
			.setDesc(t("setting_github_desc"))
			.addButton((btn) => {
				btn.setButtonText(t("btn_github_repo"))
					.setCta()
					.setIcon("github")
					.onClick(() => {
						window.open(
							"https://github.com/gustjose/obsidian-syncthing-manager",
						);
					});
			})
			.addButton((btn) => {
				btn.setButtonText(t("btn_report_bug")).onClick(() => {
					window.open(
						"https://github.com/gustjose/obsidian-syncthing-manager/issues",
					);
				});
			});
	}
}
