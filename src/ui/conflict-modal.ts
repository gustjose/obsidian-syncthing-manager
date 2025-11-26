import { App, Modal, TFile, ButtonComponent } from 'obsidian';
import { ConflictManager, ConflictFile } from '../services/conflict-manager';
import { t } from '../lang/lang';

export class ConflictModal extends Modal {
    manager: ConflictManager;
    conflicts: ConflictFile[];
    onCloseCallback: () => void;

    constructor(app: App, manager: ConflictManager, onCloseCallback: () => void) {
        super(app);
        this.manager = manager;
        this.onCloseCallback = onCloseCallback;
        this.conflicts = manager.getConflicts();
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        
        this.modalEl.addClass('st-modal-wide');

        contentEl.createEl('h2', { text: `${t('modal_conflict_title')} (${this.conflicts.length})` });

        if (this.conflicts.length === 0) {
            contentEl.createEl('p', { text: t('modal_conflict_empty') });
            return;
        }

        contentEl.createEl('p', { text: t('modal_conflict_desc') });

        this.conflicts.forEach(conflict => {
            const container = contentEl.createDiv({ cls: 'conflict-item-box' });
            
            container.createEl('h4', { 
                text: conflict.baseName, 
                cls: 'st-conflict-title'
            });
            
            container.createEl('div', { text: `Data: ${conflict.date}`, cls: 'conflict-meta' });
            container.createEl('div', { text: conflict.path, cls: 'conflict-meta-path' });

            const previewContainer = container.createDiv();
            const actionsContainer = container.createDiv({ cls: 'conflict-actions' });

            new ButtonComponent(actionsContainer)
                .setButtonText(t('btn_compare'))
                .setIcon('eye')
                .onClick(async () => {
                    if (previewContainer.hasChildNodes()) {
                        previewContainer.empty();
                        return;
                    }
                    await this.renderContentPreview(previewContainer, conflict);
                });

            actionsContainer.createSpan({ cls: 'st-flex-grow' });

            new ButtonComponent(actionsContainer)
                .setButtonText(t('btn_keep_original'))
                .setTooltip(t('tooltip_keep_original'))
                .onClick(() => {
                    this.manager.deleteConflict(conflict)
                        .then(() => this.refresh())
                        .catch(console.error);
                });

            new ButtonComponent(actionsContainer)
                .setButtonText(t('btn_keep_conflict'))
                .setCta()
                .setTooltip(t('tooltip_keep_conflict'))
                .onClick(() => {
                    this.manager.acceptConflict(conflict)
                        .then(() => this.refresh())
                        .catch(console.error);
                });
        });
    }

    async renderContentPreview(container: HTMLElement, conflict: ConflictFile) {
        container.empty();
        const diffWrapper = container.createDiv({ cls: 'st-diff-container' });

        const leftBox = diffWrapper.createDiv({ cls: 'st-diff-box' });
        leftBox.createDiv({ cls: 'st-diff-header', text: t('diff_original_header') });
        const leftContent = leftBox.createDiv({ cls: 'st-diff-content st-diff-original' });
        leftContent.setText(t('diff_loading'));

        const rightBox = diffWrapper.createDiv({ cls: 'st-diff-box' });
        rightBox.createDiv({ cls: 'st-diff-header', text: `${t('diff_conflict_header')} (${conflict.date})` });
        const rightContent = rightBox.createDiv({ cls: 'st-diff-content st-diff-conflict' });
        rightContent.setText(t('diff_loading'));

        try {
            const conflictText = await this.app.vault.read(conflict.file);
            rightContent.setText(conflictText);

            const originalPath = conflict.path.replace(conflict.file.name, conflict.baseName);
            const originalFile = this.app.vault.getAbstractFileByPath(originalPath);

            if (originalFile instanceof TFile) {
                const originalText = await this.app.vault.read(originalFile);
                leftContent.setText(originalText);
            } else {
                leftContent.setText(t('diff_original_missing'));
            }

        } catch (error) {
            console.error(error);
            leftContent.setText(t('diff_read_error'));
            rightContent.setText(t('diff_read_error'));
        }
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