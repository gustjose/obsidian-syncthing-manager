import { Plugin, Notice, WorkspaceLeaf, Platform } from 'obsidian';
import { SyncthingSettingTab } from './ui/settings';
import { t, setLanguage } from './lang/lang';
import { SyncthingAPI } from './api/syncthing-api';
import { SyncthingView, VIEW_TYPE_SYNCTHING } from './ui/view';
import { SyncthingEventMonitor } from './services/event-monitor';

// Chaves do LocalStorage (Apenas para dados SENSÍVEIS ou ESPECÍFICOS do hardware)
const LS_KEY_HOST = 'syncthing-controller-host';
const LS_KEY_PORT = 'syncthing-controller-port';
const LS_KEY_HTTPS = 'syncthing-controller-https';
const LS_KEY_API = 'syncthing-controller-api-key';
const LS_KEY_FOLDER = 'syncthing-controller-folder-id';
const LS_KEY_FOLDER_LABEL = 'syncthing-controller-folder-label';

export interface SyncthingPluginSettings {
    // Dados locais (não salvos no data.json real)
    syncthingHost: string;
    syncthingPort: string;
    useHttps: boolean;
    syncthingApiKey: string;
    syncthingFolderId: string;
    syncthingFolderLabel: string;
    
    // Dados globais (sincronizados via data.json)
    updateInterval: number;
    showStatusBar: boolean;
    showRibbonIcon: boolean;
    language: string; // <--- Agora é global
}

const DEFAULT_SETTINGS: SyncthingPluginSettings = {
    syncthingHost: '127.0.0.1',
    syncthingPort: '8384',
    useHttps: false,
    syncthingApiKey: '',
    syncthingFolderId: '',
    syncthingFolderLabel: '',
    updateInterval: 30,
    showStatusBar: true,
    showRibbonIcon: true,
    language: 'auto'
}

type SyncStatus = 'conectado' | 'sincronizando' | 'escutando' | 'desconectado' | 'erro' | 'desconhecido';

export default class SyncthingController extends Plugin {
    settings: SyncthingPluginSettings;
    statusBarItem: HTMLElement | null = null;
    ribbonIconEl: HTMLElement | null = null;
    monitor: SyncthingEventMonitor;

    public lastSyncTime: string = '--:--';
    public connectedDevices: number = 0;
    public currentStatus: SyncStatus = 'desconhecido';

    get apiUrl(): string {
        const protocol = this.settings.useHttps ? 'https://' : 'http://';
        let host = this.settings.syncthingHost.replace(/^https?:\/\//, '').replace(/\/$/, '');

        // Correção para Android:
        if (host === 'localhost' && Platform.isMobileApp) {
            host = '127.0.0.1';
        }

        return `${protocol}${host}:${this.settings.syncthingPort}`;
    }

    async onload() {
        await this.loadSettings();
        
        // Aplica o idioma salvo no data.json
        setLanguage(this.settings.language);

        this.registerView(
            VIEW_TYPE_SYNCTHING,
            (leaf) => new SyncthingView(leaf, this)
        );

        if (this.settings.showStatusBar) {
            this.statusBarItem = this.addStatusBarItem();
            this.statusBarItem.addClass('mod-clickable');
            this.statusBarItem.setAttribute('aria-label', 'Syncthing Controller');
            this.statusBarItem.addEventListener('click', async () => {
                await this.forcarSincronizacao();
            });
        }

        if (this.settings.showRibbonIcon) {
            this.ribbonIconEl = this.addRibbonIcon('refresh-cw', t('ribbon_tooltip'), () => {
                this.activateView();
            });
        }

        this.addCommand({
            id: 'open-syncthing-view',
            name: t('cmd_open_panel'),
            callback: () => { this.activateView(); }
        });

        this.addCommand({
            id: 'syncthing-force-scan',
            name: t('cmd_force_sync'),
            icon: 'refresh-cw',
            callback: async () => { await this.forcarSincronizacao(); }
        });

        this.addCommand({
            id: 'test-syncthing-connection',
            name: t('cmd_debug_connect'),
            callback: async () => { await this.verificarConexao(true); }
        });

        this.addCommand({
            id: 'debug-syncthing-connection',
            name: 'Debug: Testar Conexão (Detalhado)',
            callback: async () => {
                // 1. Pega a URL calculada (já com a correção de IP se você aplicou)
                const urlAlvo = this.apiUrl; 
                
                // 2. Mostra na tela qual URL está sendo usada
                // Isso vai te confirmar se o "localhost" virou "127.0.0.1"
                new Notice(`Tentando conectar em:\n${urlAlvo}`, 5000); // Fica 5s na tela
                console.log(`[DEBUG] URL Alvo: ${urlAlvo}`);

                try {
                    // 3. Tenta fazer o request básico de status
                    const status = await SyncthingAPI.getStatus(urlAlvo, this.settings.syncthingApiKey);
                    
                    // 4. Se der certo, mostra o ID do dispositivo
                    new Notice(`✅ SUCESSO!\nConectado ao Device ID:\n${status.myID.substring(0, 10)}...`, 5000);
                    console.log('[DEBUG] Sucesso:', status);
                    
                } catch (error) {
                    // 5. Se der erro, mostra a mensagem exata do erro na tela
                    let msgErro = 'Erro desconhecido';
                    if (error instanceof Error) msgErro = error.message;
                    
                    new Notice(`❌ FALHA:\n${msgErro}`, 10000); // Fica 10s na tela
                    console.error('[DEBUG] Erro detalhado:', error);
                }
            }
        });

        this.monitor = new SyncthingEventMonitor(this);
        this.addSettingTab(new SyncthingSettingTab(this.app, this));

        this.atualizarTodosVisuais();
        await this.verificarConexao(false);
        await this.atualizarContagemDispositivos();
        
        this.monitor.start();
    }

    onunload() {
        if (this.monitor) this.monitor.stop();
    }

    async activateView() {
        const { workspace } = this.app;
        let leaf: WorkspaceLeaf | null = null;
        const leaves = workspace.getLeavesOfType(VIEW_TYPE_SYNCTHING);

        if (leaves.length > 0) {
            leaf = leaves[0];
        } else {
            leaf = workspace.getRightLeaf(false);
            if (leaf) await leaf.setViewState({ type: VIEW_TYPE_SYNCTHING, active: true });
        }
        if (leaf) workspace.revealLeaf(leaf);
    }

    atualizarTodosVisuais() {
        this.atualizarStatusBar(this.currentStatus);
        const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_SYNCTHING);
        leaves.forEach((leaf) => {
            if (leaf.view instanceof SyncthingView) leaf.view.updateView();
        });
    }

    async testarApiApenas() {
        try {
            new Notice('Ping...');
            const status = await SyncthingAPI.getStatus(this.apiUrl, this.settings.syncthingApiKey);
            new Notice(`${t('notice_success_conn')} ${status.myID.substring(0, 5)}...`);
        } catch (error) {
            new Notice(t('notice_fail_conn'));
            console.error(error);
        }
    }

    async atualizarContagemDispositivos() {
        try {
            const connections = await SyncthingAPI.getConnections(this.apiUrl, this.settings.syncthingApiKey);
            const devices = connections.connections || {};
            const count = Object.values(devices).filter((d: any) => d.connected).length;
            this.connectedDevices = count;
            this.atualizarTodosVisuais();
        } catch (e) {
            console.error("Erro ao buscar dispositivos:", e);
        }
    }

    async forcarSincronizacao() {
        if (!this.settings.syncthingApiKey) {
            new Notice(t('notice_config_first'));
            return;
        }

        if ((this.app as any).commands) {
            (this.app as any).commands.executeCommandById('editor:save-file');
        }

        new Notice(t('notice_syncing'));
        this.currentStatus = 'sincronizando';
        this.atualizarTodosVisuais();

        try {
            await SyncthingAPI.forceScan(
                this.apiUrl, 
                this.settings.syncthingApiKey, 
                this.settings.syncthingFolderId 
            );
            await this.atualizarContagemDispositivos();
        } catch (error) {
            console.error('Erro ao forçar scan:', error);
            new Notice('Erro ao solicitar Sync.');
            this.currentStatus = 'erro';
            this.atualizarTodosVisuais();
        }
    }
    
    async verificarConexao(showNotice: boolean = false) {
        try {
            const systemStatus = await SyncthingAPI.getStatus(this.apiUrl, this.settings.syncthingApiKey);
            
            if (this.settings.syncthingFolderId) {
                const folderStats = await SyncthingAPI.getFolderStats(this.apiUrl, this.settings.syncthingApiKey, this.settings.syncthingFolderId);
                const state = folderStats.state;
                const needBytes = folderStats.needBytes; 

                if (state === 'scanning' || state === 'syncing' || needBytes > 0) {
                    this.currentStatus = 'sincronizando';
                    if (showNotice) new Notice(t('notice_syncing'));
                } else if (state === 'idle' && needBytes === 0) {
                    this.lastSyncTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    this.currentStatus = 'conectado';
                    if (showNotice) new Notice(t('status_synced'));
                } else {
                    this.currentStatus = 'erro';
                    if (showNotice) new Notice(`Status: ${state}`);
                }
            } else {
                this.currentStatus = 'conectado';
                if (showNotice) new Notice(`${t('notice_success_conn')} ${systemStatus.myID.substring(0, 5)}...`);
            }
            this.atualizarTodosVisuais();

        } catch (error) {
            console.error(error);
            if (error instanceof Error && error.message.includes('403')) {
                this.currentStatus = 'erro';
                if (showNotice) new Notice(t('notice_error_auth'));
            } else {
                this.currentStatus = 'desconectado';
                if (showNotice) new Notice(t('notice_offline'));
            }
            this.atualizarTodosVisuais();
        }
    }

    atualizarStatusBar(status: SyncStatus) {
        this.currentStatus = status; 
        let text = t('status_unknown');
        let color = 'var(--text-muted)';
        let color_bg = 'currentColor'; 

        switch (status) {
            case 'conectado': 
                text = t('status_synced'); color = 'var(--text-success)'; break;
            case 'sincronizando': 
                text = t('status_syncing'); color = 'var(--text-warning)'; break;
            case 'desconectado':
                text = t('status_offline'); color = 'var(--text-muted)'; break;
            case 'erro':
                text = t('status_error'); color = 'var(--text-error)'; break;
        }

        const tooltipInfo = `${text}\n\n${t('info_last_sync')}: ${this.lastSyncTime}\n${t('info_devices')}: ${this.connectedDevices}`;
        
        const customSvg = `<svg viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg" fill="none" style="width: 100%; height: 100%;"><path d="M161.785 101.327a66 66 0 0 1-4.462 19.076m-49.314 40.495A66 66 0 0 1 96 162a66 66 0 0 1-45.033-17.75M31.188 83.531A66 66 0 0 1 96 30a66 66 0 0 1 39.522 13.141" stroke="${color_bg}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M146.887 147.005a9 9 0 0 1-9 9 9 9 0 0 1-9-9 9 9 0 0 1 9-9 9 9 0 0 1 9-9 9 9 0 0 1 9 9zm18.25-78.199a9 9 0 0 1-9 9 9 9 0 0 1-9-9 9 9 0 0 1 9-9 9 9 0 0 1 9 9zM118.5 105a9 9 0 0 1-9 9 9 9 0 0 1-9-9 9 9 0 0 1 9-9 9 9 0 0 1 9 9zm-76.248 11.463a9 9 0 0 1-9 9 9 9 0 0 1-9-9 9 9 0 0 1 9-9 9 9 0 0 1 9 9zm113.885-68.656a21 21 0 0 0-21 21 21 21 0 0 0 1.467 7.564l-14.89 11.555A21 21 0 0 0 109.5 84a21 21 0 0 0-20.791 18.057l-36.45 5.48a21 21 0 0 0-19.007-12.074 21 21 0 0 0-21 21 21 21 0 0 0 21 21 21 21 0 0 0 20.791-18.059l36.463-5.48A21 21 0 0 0 109.5 126a21 21 0 0 0 6.283-.988l5.885 8.707a21 21 0 0 0-4.781 13.287 21 21 0 0 0 21 21 21 21 0 0 0 21-21 21 21 0 0 0-21-21 21 21 0 0 0-6.283.986l-5.883-8.707A21 21 0 0 0 130.5 105a21 21 0 0 0-1.428-7.594l14.885-11.552a21 21 0 0 0 12.18 3.953 21 21 0 0 0 21-21 21 21 0 0 0-21-21z" fill="currentColor" fill-rule="evenodd"/></svg>`;

        if (this.statusBarItem) {
            this.statusBarItem.empty();
            const iconSpan = this.statusBarItem.createSpan({ cls: 'status-bar-item-icon' });
            iconSpan.innerHTML = customSvg.replace('style="width: 100%; height: 100%;"', 'width="20" height="20"'); 
            this.statusBarItem.style.color = color;
            this.statusBarItem.setAttribute('aria-label', tooltipInfo);
        }

        if (this.ribbonIconEl) {
            this.ribbonIconEl.empty();
            const iconContainer = this.ribbonIconEl.createDiv({ cls: 'ribbon-icon-svg' });
            iconContainer.innerHTML = customSvg;
            this.ribbonIconEl.style.color = color;
            this.ribbonIconEl.setAttribute('aria-label', tooltipInfo);
        }
    }

    async loadSettings() {
        // 1. Carrega tudo do data.json (incluindo o Idioma)
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

        // Sanitização: Limpa placeholders antigos se ainda existirem no data.json
        if ((this.settings.syncthingHost as string) === 'device-specific') this.settings.syncthingHost = '';
        if ((this.settings.syncthingPort as string) === 'device-specific') this.settings.syncthingPort = '';

        // 2. Sobrescreve APENAS os dados de conexão com o LocalStorage
        const localHost = window.localStorage.getItem(LS_KEY_HOST);
        const localPort = window.localStorage.getItem(LS_KEY_PORT);
        const localHttps = window.localStorage.getItem(LS_KEY_HTTPS);
        const localKey = window.localStorage.getItem(LS_KEY_API);
        const localFolder = window.localStorage.getItem(LS_KEY_FOLDER);
        const localFolderLabel = window.localStorage.getItem(LS_KEY_FOLDER_LABEL);

        if (localHost) this.settings.syncthingHost = localHost;
        if (localPort) this.settings.syncthingPort = localPort;
        if (localHttps !== null) this.settings.useHttps = (localHttps === 'true');
        if (localKey) this.settings.syncthingApiKey = localKey;
        if (localFolder) this.settings.syncthingFolderId = localFolder;
        if (localFolderLabel) this.settings.syncthingFolderLabel = localFolderLabel;
    }

    async saveSettings() {
        // 1. Salva no data.json: Configurações GERAIS e IDIOMA
        const sharedSettings = {
            updateInterval: this.settings.updateInterval,
            showStatusBar: this.settings.showStatusBar,
            showRibbonIcon: this.settings.showRibbonIcon,
            language: this.settings.language, // <--- SALVO NO JSON COMPARTILHADO
            
            // Placeholders para não vazar dados locais
            syncthingHost: 'device-specific',
            syncthingPort: 'device-specific',
            useHttps: false, 
            syncthingApiKey: 'device-specific',
            syncthingFolderId: 'device-specific',
            syncthingFolderLabel: 'device-specific'
        };
        await this.saveData(sharedSettings);

        // 2. Salva no LocalStorage: Apenas dados locais e sensíveis
        window.localStorage.setItem(LS_KEY_HOST, this.settings.syncthingHost);
        window.localStorage.setItem(LS_KEY_PORT, this.settings.syncthingPort);
        window.localStorage.setItem(LS_KEY_HTTPS, String(this.settings.useHttps));
        window.localStorage.setItem(LS_KEY_API, this.settings.syncthingApiKey);
        window.localStorage.setItem(LS_KEY_FOLDER, this.settings.syncthingFolderId);
        window.localStorage.setItem(LS_KEY_FOLDER_LABEL, this.settings.syncthingFolderLabel);
    }
}