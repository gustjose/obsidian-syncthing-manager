import { ItemView, WorkspaceLeaf, setIcon } from 'obsidian';
import SyncthingController from '../main';
import { t } from '../lang/lang';
import { ConflictManager } from '../services/conflict-manager';
import { ConflictModal } from '../ui/conflict-modal';

export const VIEW_TYPE_SYNCTHING = 'syncthing-view';

export class SyncthingView extends ItemView {
    plugin: SyncthingController;
    conflictManager: ConflictManager;

    constructor(leaf: WorkspaceLeaf, plugin: SyncthingController) {
        super(leaf);
        this.plugin = plugin;
        this.conflictManager = new ConflictManager(plugin.app);
    }

    getViewType() { return VIEW_TYPE_SYNCTHING; }
    getDisplayText() { return 'Syncthing Controller'; }
    getIcon() { return 'refresh-cw'; }

    onOpen() { 
        this.render(); 
        return Promise.resolve();
    }
    async onClose() {}

    render() {
        const container = this.containerEl.children[1];
        container.empty();
        container.addClass('syncthing-view-container');

        // 1. Conflitos
        if (this.plugin.settings.modalConflict) {
            const conflicts = this.conflictManager.getConflicts();
            if (conflicts.length > 0) {
                const alertBox = container.createDiv({ cls: 'st-conflict-alert' });
                
                const iconSpan = alertBox.createSpan();
                setIcon(iconSpan, 'alert-octagon');
                alertBox.createSpan({ text: ` ${conflicts.length} ${t('alert_conflict_detected')}` });
                
                alertBox.createDiv({ 
                    text: t('alert_click_to_resolve'), 
                    cls: 'st-conflict-subtext' 
                });
                
                alertBox.addEventListener('click', () => {
                    new ConflictModal(this.app, this.conflictManager, () => {
                        this.render(); 
                    }).open();
                });
            }
        }

        // 2. Status
        const statusBox = container.createDiv({ cls: 'st-status-box' });
        const iconDiv = statusBox.createDiv({ cls: 'st-big-icon' });
        
        const currentStatus = this.plugin.currentStatus;
        
        let cssClass = 'st-color-muted';
        let statusText = t('status_unknown');

        switch (currentStatus) {
            case 'conectado': 
                cssClass = 'st-color-success'; 
                statusText = t('status_synced');
                setIcon(iconDiv, 'check-circle');
                break;
            case 'sincronizando': 
                cssClass = 'st-color-warning'; 
                statusText = t('status_syncing');
                setIcon(iconDiv, 'loader');
                break;
            case 'desconectado':
                cssClass = 'st-color-muted';
                statusText = t('status_offline');
                setIcon(iconDiv, 'wifi-off');
                break;
            case 'erro':
                cssClass = 'st-color-error';
                statusText = t('status_error');
                setIcon(iconDiv, 'alert-triangle');
                break;
        }
        
        iconDiv.addClass(cssClass);
        statusBox.createDiv({ cls: 'st-status-text', text: statusText }).addClass(cssClass);

        // 3. Tabela
        const infoContainer = container.createDiv({ cls: 'st-info-container' });
        this.createRow(infoContainer, 'clock', t('info_last_sync'), this.plugin.lastSyncTime);
        this.createRow(infoContainer, 'monitor', t('info_devices'), this.plugin.connectedDevices.toString());
        
        const folderDisplay = this.plugin.settings.syncthingFolderLabel || 'Default';
        this.createRow(infoContainer, 'folder', t('info_folder'), folderDisplay);

        // 4. Botão
        const btnContainer = container.createDiv({ cls: 'st-btn-container' });
        const btn = btnContainer.createEl('button', { cls: 'mod-cta', text: t('btn_sync_now') });
        
        btn.addEventListener('click', () => {
            btn.setText(t('btn_requesting'));
            btn.disabled = true;
            this.plugin.forcarSincronizacao().catch(err => console.error(err));
        });
    }

    createRow(container: HTMLElement, icon: string, label: string, value: string) {
        const row = container.createDiv({ cls: 'st-info-row' });
        const left = row.createDiv({ cls: 'st-info-left' });
        setIcon(left.createSpan({ cls: 'st-info-icon' }), icon);
        left.createSpan({ text: label });
        
        row.createDiv({ cls: 'st-info-value', text: value });
    }

    updateView() {
        this.render();
    }
}