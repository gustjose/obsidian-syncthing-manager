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

    async onOpen() { this.render(); }
    async onClose() {}

    render() {
        const container = this.containerEl.children[1];
        container.empty();
        container.addClass('syncthing-view-container');

        // 1. Conflitos
        const conflicts = this.conflictManager.getConflicts();
        if (conflicts.length > 0) {
            const alertBox = container.createDiv({ cls: 'st-conflict-alert' });
            
            // Estilos diretos no elemento são permitidos (o erro era passar no objeto {})
            alertBox.style.backgroundColor = 'var(--background-modifier-error)';
            alertBox.style.color = 'var(--text-on-accent)';
            alertBox.style.padding = '12px';
            alertBox.style.borderRadius = '6px';
            alertBox.style.marginBottom = '20px';
            alertBox.style.textAlign = 'center';
            alertBox.style.fontWeight = 'bold';
            alertBox.style.cursor = 'pointer';
            alertBox.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
            
            const iconSpan = alertBox.createSpan();
            setIcon(iconSpan, 'alert-octagon');
            alertBox.createSpan({ text: ` ${conflicts.length} Conflito(s) Detectado(s)!` });
            
            // Aqui usamos a CLASSE do CSS que você já copiou
            alertBox.createDiv({ 
                text: 'Clique aqui para resolver', 
                cls: 'st-conflict-subtext' 
            });
            
            alertBox.addEventListener('click', () => {
                new ConflictModal(this.app, this.conflictManager, () => {
                    this.render(); 
                }).open();
            });
        }

        // 2. Status
        const statusBox = container.createDiv({ cls: 'st-status-box' });
        const iconDiv = statusBox.createDiv({ cls: 'st-big-icon' });
        
        const currentStatus = this.plugin.currentStatus;
        let color = 'var(--text-muted)';
        let statusText = t('status_unknown');

        switch (currentStatus) {
            case 'conectado': 
                color = 'var(--text-success)'; 
                statusText = t('status_synced');
                setIcon(iconDiv, 'check-circle');
                break;
            case 'sincronizando': 
                color = 'var(--text-warning)'; 
                statusText = t('status_syncing');
                setIcon(iconDiv, 'loader');
                break;
            case 'desconectado':
                color = 'var(--text-muted)';
                statusText = t('status_offline');
                setIcon(iconDiv, 'wifi-off');
                break;
            case 'erro':
                color = 'var(--text-error)';
                statusText = t('status_error');
                setIcon(iconDiv, 'alert-triangle');
                break;
        }
        
        iconDiv.style.color = color;
        statusBox.createDiv({ cls: 'st-status-text', text: statusText }).style.color = color;

        // 3. Tabela
        const infoContainer = container.createDiv({ cls: 'st-info-container' });
        this.createRow(infoContainer, 'clock', t('info_last_sync'), this.plugin.lastSyncTime);
        this.createRow(infoContainer, 'monitor', t('info_devices'), this.plugin.connectedDevices.toString());
        
        const folderDisplay = this.plugin.settings.syncthingFolderLabel || 'Default';
        this.createRow(infoContainer, 'folder', t('info_folder'), folderDisplay);

        // 4. Botão
        const btnContainer = container.createDiv({ cls: 'st-btn-container' });
        const btn = btnContainer.createEl('button', { cls: 'mod-cta', text: t('btn_sync_now') });
        
        btn.addEventListener('click', async () => {
            btn.setText(t('btn_requesting'));
            btn.disabled = true;
            await this.plugin.forcarSincronizacao();
        });
    }

    createRow(container: HTMLElement, icon: string, label: string, value: string) {
        const row = container.createDiv({ cls: 'st-info-row' });
        const left = row.createDiv({ cls: 'st-info-left' });
        setIcon(left.createSpan({ cls: 'st-info-icon' }), icon);
        left.createSpan({ text: label });
        
        const valueDiv = row.createDiv({ cls: 'st-info-value', text: value });
        valueDiv.style.maxWidth = '150px';
        valueDiv.style.whiteSpace = 'nowrap';
        valueDiv.style.overflow = 'hidden';
        valueDiv.style.textOverflow = 'ellipsis';
    }

    updateView() {
        this.render();
    }
}