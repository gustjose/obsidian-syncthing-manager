import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import SyncthingController from '../main';
import { SyncthingAPI } from '../api/syncthing-api';
import { t, setLanguage } from '../lang/lang';
import { IgnoreModal } from './ignore-modal';

export class SyncthingSettingTab extends PluginSettingTab {
    plugin: SyncthingController;

    constructor(app: App, plugin: SyncthingController) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        new Setting(containerEl).setName('Syncthing Manager').setHeading();

        // GERAL
        containerEl.createEl('h4', { text: t('setting_header_general') });

        new Setting(containerEl)
            .setName(t('setting_lang_name'))
            .setDesc(t('setting_lang_desc'))
            .addDropdown(dropDown => {
                dropDown.addOption('auto', 'Auto');
                dropDown.addOption('en', 'English');
                dropDown.addOption('pt', 'Português');
                dropDown.setValue(this.plugin.settings.language);
                dropDown.onChange(async (value) => {
                    this.plugin.settings.language = value;
                    await this.plugin.saveSettings();
                    setLanguage(value); 
                    this.display(); 
                });
            });

        // CONEXÃO
        containerEl.createEl('h4', { text: t('setting_header_conn') });

        new Setting(containerEl)
            .setName(t('setting_host_name'))
            .setDesc(t('setting_host_desc'))
            .addText(text => {
                text.setPlaceholder('127.0.0.1')
                    .setValue(this.plugin.settings.syncthingHost)
                    .onChange(async (value) => {
                        this.plugin.settings.syncthingHost = value;
                        await this.plugin.saveSettings();
                    });
                text.inputEl.addClass('st-input-full-width');
            });

        new Setting(containerEl)
            .setName(t('setting_port_name'))
            .setDesc(t('setting_port_desc'))
            .addText(text => {
                text.setPlaceholder('8384')
                    .setValue(this.plugin.settings.syncthingPort)
                    .onChange(async (value) => {
                        this.plugin.settings.syncthingPort = value;
                        await this.plugin.saveSettings();
                    });
                text.inputEl.addClass('st-input-full-width');
            });

        new Setting(containerEl)
            .setName(t('setting_https_name'))
            .setDesc(t('setting_https_desc'))
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.useHttps)
                .onChange(async (value) => {
                    this.plugin.settings.useHttps = value;
                    await this.plugin.saveSettings();
                }));

        const api_key_Setting = new Setting(containerEl)
            .setName(t('setting_api_name'))
            .setDesc(t('setting_api_desc'))
            .addText(text => {
                text.setPlaceholder('...')
                    .setValue(this.plugin.settings.syncthingApiKey)
                    .onChange(async (value) => {
                        this.plugin.settings.syncthingApiKey = value;
                        await this.plugin.saveSettings();
                    });
                text.inputEl.type = 'password';
                text.inputEl.addClass('st-input-full-width');
            });

        api_key_Setting.addButton(button => button
                .setButtonText(t('btn_test_conn'))
                .setCta()
                .onClick(async () => {
                    await this.plugin.testarApiApenas();
                }));

        // PASTA
        containerEl.createEl('br');
        containerEl.createEl('h4', { text: t('setting_header_folder') });

        const folderSetting = new Setting(containerEl)
            .setName(t('setting_folder_name'))
            .setDesc(t('setting_folder_desc'));

        folderSetting.addDropdown(async (dropdown) => {
            const currentId = this.plugin.settings.syncthingFolderId;
            const currentLabel = this.plugin.settings.syncthingFolderLabel;
            const display = currentLabel || currentId || t('dropdown_none');
            dropdown.addOption(currentId, display);
            dropdown.setValue(currentId);

            dropdown.onChange(async (value) => {
                this.plugin.settings.syncthingFolderId = value;
                const index = dropdown.selectEl.selectedIndex;
                if (index >= 0) {
                    const label = dropdown.selectEl.options[index].text;
                    this.plugin.settings.syncthingFolderLabel = label;
                } else {
                    this.plugin.settings.syncthingFolderLabel = '';
                }
                await this.plugin.saveSettings();
                this.plugin.verificarConexao(false); 
            });
        });

        folderSetting.addExtraButton(btn => btn
            .setIcon('search')
            .setTooltip(t('btn_search_folders'))
            .onClick(async () => {
                try {
                    new Notice(t('notice_searching'));
                    const folders = await SyncthingAPI.getFolders(this.plugin.apiUrl, this.plugin.settings.syncthingApiKey);
                    const selectEl = folderSetting.controlEl.querySelector('select');
                    if (selectEl) selectEl.innerHTML = '';
                    
                    const optionDefault = document.createElement('option');
                    optionDefault.value = '';
                    optionDefault.text = t('dropdown_default');
                    selectEl?.appendChild(optionDefault);

                    folders.forEach((folder: any) => {
                        const option = document.createElement('option');
                        option.value = folder.id;
                        option.text = folder.label || folder.id;
                        option.selected = (folder.id === this.plugin.settings.syncthingFolderId);
                        selectEl?.appendChild(option);
                    });
                    
                    new Notice(`${folders.length} ${t('notice_folders_found')}`);
                } catch (error) {
                    new Notice(t('notice_fail_conn'));
                    console.error(error);
                }
            }));
        
        new Setting(containerEl)
            .setName(t('setting_modal_conflict_name'))
            .setDesc(t('setting_modal_conflict_desc'))
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.modalConflict)
                .onChange(async (value) => {
                    this.plugin.settings.modalConflict = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName(t('setting_ignore_name'))
            .setDesc(t('setting_ignore_desc'))
            .addButton(btn => btn
                .setButtonText(t('btn_edit_ignore'))
                .setIcon('file-minus')
                .onClick(() => {
                    new IgnoreModal(this.app).open();
                }));

        // INTERFACE
        containerEl.createEl('br');
        containerEl.createEl('h4', { text: t('setting_header_interface') });

        new Setting(containerEl)
            .setName(t('setting_status_bar_name'))
            .setDesc(t('setting_status_bar_desc'))
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showStatusBar)
                .onChange(async (value) => {
                    this.plugin.settings.showStatusBar = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName(t('setting_ribbon_name'))
            .setDesc(t('setting_ribbon_desc'))
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showRibbonIcon)
                .onChange(async (value) => {
                    this.plugin.settings.showRibbonIcon = value;
                    await this.plugin.saveSettings();
                }));
    }
}