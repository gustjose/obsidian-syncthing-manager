import { App, Modal, Setting, Notice, TextAreaComponent } from 'obsidian';
import { IgnoreManager } from '../services/ignore-manager';
import { t } from '../lang/lang';

export class IgnoreModal extends Modal {
    manager: IgnoreManager;
    content: string = '';

    constructor(app: App) {
        super(app);
        this.manager = new IgnoreManager(app);
    }

    async onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        
        this.modalEl.addClass('st-modal-wide');

        contentEl.createEl('h2', { text: t('modal_ignore_title') });
        contentEl.createEl('p', { text: t('modal_ignore_desc') });

        this.content = await this.manager.readIgnoreFile();

        const container = contentEl.createDiv();

        const textArea = new TextAreaComponent(container);
        textArea.inputEl.addClass('st-textarea-code');
        textArea.setValue(this.content);
        
        textArea.onChange((value) => {
            this.content = value;
        });

        container.createEl('br');
        
        const details = container.createEl('details', { cls: 'st-details-box' });

        const summary = details.createEl('summary', { 
            text: t('header_ignore_templates'),
            cls: 'st-summary-title'
        });

        const suggestionsContainer = details.createDiv();

        const patterns = [
            { label: 'Workspace Config', rule: '.obsidian/workspace*' },
            { label: 'Installer Cache', rule: '.obsidian/installer.json' },
            { label: 'Hidden Folders', rule: '.*' },
        ];

        patterns.forEach(p => {
            const settingDiv = suggestionsContainer.createDiv();
            new Setting(settingDiv)
                .setName(p.label)
                .setDesc(p.rule)
                .addButton(btn => btn
                    .setButtonText(t('btn_add_ignore'))
                    .onClick(() => {
                        if (!this.content.includes(p.rule)) {
                            this.content = this.content.trim() + '\n' + p.rule;
                            textArea.setValue(this.content);
                        } else {
                            new Notice(t('notice_ignore_exists'));
                        }
                    }));
        });

        const footer = contentEl.createDiv({ cls: 'st-modal-footer' });

        const btnSave = footer.createEl('button', { cls: 'mod-cta', text: t('btn_save_ignore') });
        btnSave.addEventListener('click', async () => {
            await this.manager.saveIgnoreFile(this.content);
            new Notice(t('notice_ignore_saved'));
            this.close();
        });
    }

    onClose() {
        this.contentEl.empty();
    }
}