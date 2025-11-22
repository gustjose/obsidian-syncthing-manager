export default {
    // Comandos
    cmd_open_panel: 'Abrir Painel Lateral',
    cmd_force_sync: 'Forçar Sincronização Agora',
    cmd_debug_connect: 'Debug: Testar Conexão',

    // Ribbon
    ribbon_tooltip: 'Abrir Syncthing Controller',

    // Status / View
    status_synced: 'Sincronizado',
    status_syncing: 'Sincronizando...',
    status_offline: 'Desconectado',
    status_error: 'Erro',
    status_unknown: 'Desconhecido',
    
    info_last_sync: 'Último Sync',
    info_devices: 'Dispositivos Online',
    info_folder: 'Pasta',
    btn_sync_now: 'Sincronizar Agora',
    btn_requesting: 'Solicitando...',

    // Settings - Headers
    setting_header_conn: 'Conexão',
    setting_header_folder: 'Monitoramento de Pasta',
    setting_header_interface: 'Interface',
    setting_header_general: 'Geral',

    // Settings - General
    setting_lang_name: 'Idioma',
    setting_lang_desc: 'Force um idioma específico ou use Automático.',

    // Settings - Connection
    setting_https_name: 'Usar HTTPS',
    setting_https_desc: 'Ative se o Syncthing usa conexão segura (TLS). Geralmente desligado para localhost.',
    setting_host_name: 'Endereço IP / Host',
    setting_host_desc: 'Padrão: 127.0.0.1 (localhost).',
    setting_port_name: 'Porta',
    setting_port_desc: 'Padrão: 8384.',
    setting_api_name: 'Chave da API (API Key)',
    setting_api_desc: 'Encontre em Syncthing > Ações > Configurações > Geral.',
    btn_test_conn: 'Testar Conexão',
    
    // Settings - Folder
    setting_folder_name: 'Pasta do Cofre',
    setting_folder_desc: 'Selecione qual pasta do Syncthing corresponde a este cofre.',
    dropdown_default: 'Selecione uma pasta',
    dropdown_none: 'Nenhuma selecionada',
    btn_search_folders: 'Buscar pastas (usa configurações acima)',

    // Settings - Interface
    setting_status_bar_name: 'Mostrar na Barra de Status',
    setting_status_bar_desc: 'Apenas Desktop. Recarregue para aplicar.',
    setting_ribbon_name: 'Mostrar Ícone no Ribbon',
    setting_ribbon_desc: 'Barra lateral esquerda (Desktop/Mobile). Recarregue para aplicar.',

    // Notices / Errors
    notice_syncing: 'Sincronizando...',
    notice_success_conn: 'Sucesso! Conectado ao ID: ',
    notice_fail_conn: 'Falha. Verifique IP, Porta e HTTPS.',
    notice_error_auth: 'Erro de Autenticação.',
    notice_offline: 'Syncthing Offline.',
    notice_folders_found: 'pastas encontradas!',
    notice_config_first: 'Configure a API Key primeiro.',
    notice_searching: 'Buscando pastas...',

    // Modal de Conflitos
    modal_conflict_title: 'Resolver Conflitos',
    modal_conflict_empty: 'Nenhum arquivo de conflito encontrado. Tudo limpo!',
    modal_conflict_desc: 'Escolha qual versão você deseja manter.',
    btn_compare: 'Comparar Conteúdo',
    btn_keep_original: 'Manter Original',
    tooltip_keep_original: 'Apaga o arquivo de conflito (o da direita) e mantém o atual.',
    btn_keep_conflict: 'Usar Esta Versão',
    tooltip_keep_conflict: 'Substitui o original pelo arquivo de conflito.',
    
    // Visualização de Diferença
    diff_original_header: 'Arquivo Original (Atual)',
    diff_conflict_header: 'Versão em Conflito',
    diff_loading: 'Carregando...',
    diff_original_missing: '(Arquivo original não encontrado ou foi deletado)',
    diff_read_error: 'Erro ao ler arquivo.'
};