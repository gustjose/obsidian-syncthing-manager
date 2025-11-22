import { requestUrl, RequestUrlParam } from 'obsidian';

export class SyncthingAPI {
    
    // Checa se o servidor está online (Ping)
    static async getStatus(url: string, apiKey: string): Promise<any> {
        return this.request(url, apiKey, '/rest/system/status');
    }

    // Busca a lista de todas as pastas
    static async getFolders(url: string, apiKey: string): Promise<any[]> {
        const config = await this.request(url, apiKey, '/rest/config');
        return config.folders;
    }

    // Busca o status de uma pasta
    static async getFolderStats(url: string, apiKey: string, folderId: string): Promise<any> {
        return this.request(url, apiKey, `/rest/db/status?folder=${folderId}`);
    }

    static async getConnections(url: string, apiKey: string): Promise<any> {
        return this.request(url, apiKey, '/rest/system/connections');
    }

    // --- NOVO: Força o Scan (Sincronização) ---
    static async forceScan(url: string, apiKey: string, folderId?: string): Promise<any> {
        let endpoint = '/rest/db/scan';
        // Se tiver um ID de pasta, forçamos scan SÓ nela (mais rápido).
        // Se não tiver, o Syncthing faz scan em tudo.
        if (folderId) {
            endpoint += `?folder=${folderId}`;
        }
        // Nota: Scan exige método POST
        return this.request(url, apiKey, endpoint, 'POST'); 
    }

    // Refatorei para aceitar o método (GET/POST)
    private static async request(url: string, apiKey: string, endpointPath: string, method: string = 'GET'): Promise<any> {
        const baseUrl = url.replace(/\/$/, '');
        const endpoint = `${baseUrl}${endpointPath}`;

        const params: RequestUrlParam = {
            url: endpoint,
            method: method, // Agora é dinâmico
            headers: { 'X-API-Key': apiKey }
        };

        const response = await requestUrl(params);

        // O Syncthing retorna 200 (OK) para a maioria das coisas
        if (response.status === 200) {
            // O Endpoint de Scan retorna vazio ou texto simples, nem sempre JSON
            if (response.text && response.text.length > 0) {
                try {
                    return response.json;
                } catch {
                    return response.text;
                }
            }
            return {};
        } else {
            throw new Error(`Erro HTTP ${response.status}: ${endpointPath}`);
        }
    }
}