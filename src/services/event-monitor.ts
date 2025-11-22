import { requestUrl, Notice } from 'obsidian';
import SyncthingController from '../main';

export class SyncthingEventMonitor {
    plugin: SyncthingController;
    running: boolean = false;
    lastEventId: number = 0;

    constructor(plugin: SyncthingController) {
        this.plugin = plugin;
    }

    async start() {
        if (this.running) return;
        
        try {
            // MUDANÇA AQUI: Usa o getter this.plugin.apiUrl
            const url = `${this.plugin.apiUrl}/rest/events?limit=1`;
            const response = await requestUrl({
                url: url,
                method: 'GET',
                headers: { 'X-API-Key': this.plugin.settings.syncthingApiKey }
            });

            if (response.status === 200 && Array.isArray(response.json) && response.json.length > 0) {
                const lastEvent = response.json[response.json.length - 1];
                this.lastEventId = lastEvent.id;
            }
        } catch (e) {
            console.error("Erro ao buscar ID inicial:", e);
        }

        this.running = true;
        this.loop();
    }

    stop() {
        this.running = false;
    }

    private async loop() {
        while (this.running) {
            try {
                if (!this.plugin.settings.syncthingApiKey) {
                    await this.sleep(5000);
                    continue;
                }

                // MUDANÇA AQUI: Usa o getter this.plugin.apiUrl
                const url = `${this.plugin.apiUrl}/rest/events?since=${this.lastEventId}&timeout=60`;
                
                const response = await requestUrl({
                    url: url,
                    method: 'GET',
                    headers: { 'X-API-Key': this.plugin.settings.syncthingApiKey }
                });

                if (response.status === 200) {
                    const events = response.json;
                    if (Array.isArray(events) && events.length > 0) {
                        for (const event of events) {
                            this.lastEventId = event.id;
                            this.processEvent(event);
                        }
                    }
                } 

            } catch (error) {
                await this.sleep(2000);
            }
        }
    }
    
    // ... MANTENHA O RESTO DO ARQUIVO (processEvent, updateStatusFromState, sleep) IGUAL ...
    // Copie do arquivo anterior, a lógica de processamento de eventos não mudou.
    
    private processEvent(event: any) {
        const targetFolder = this.plugin.settings.syncthingFolderId;
        if (!targetFolder) return;

        // 1. Dispositivos
        if (event.type === 'DeviceConnected' || event.type === 'DeviceDisconnected') {
            this.plugin.atualizarContagemDispositivos();
        }

        // 2. FolderCompletion
        if (event.type === 'FolderCompletion') {
            const data = event.data;
            if (data.folder === targetFolder) {
                if (data.completion < 100 || data.needBytes > 0) {
                    this.plugin.atualizarStatusBar('sincronizando');
                } else {
                    this.plugin.lastSyncTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    this.plugin.atualizarStatusBar('conectado');
                }
            }
        }

        // 3. StateChanged
        if (event.type === 'StateChanged') {
            const data = event.data;
            if (data.folder === targetFolder) {
                if (data.to === 'scanning' || data.to === 'syncing') {
                    this.plugin.atualizarStatusBar('sincronizando');
                } else if (data.to === 'idle') {
                    this.plugin.lastSyncTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    this.plugin.atualizarStatusBar('conectado');
                } else if (data.to === 'error') {
                    this.plugin.atualizarStatusBar('erro');
                }
            }
        }
        
        // 4. FolderSummary
        if (event.type === 'FolderSummary') {
             const data = event.data;
             if (data.folder === targetFolder) {
                 if (data.summary.needBytes > 0) {
                     this.plugin.atualizarStatusBar('sincronizando');
                 } else {
                     this.plugin.lastSyncTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                     this.plugin.atualizarStatusBar('conectado');
                 }
             }
        }
    }

    private sleep(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}