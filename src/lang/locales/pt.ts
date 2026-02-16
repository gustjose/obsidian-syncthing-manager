export default {
	// Comandos
	cmd_open_panel: "Abrir Painel Lateral",
	cmd_force_sync: "Forçar Sincronização Agora",
	cmd_debug_connect: "Debug: Testar Conexão",

	// Ribbon
	ribbon_tooltip: "Abrir Syncthing Controller",

	// Status / View
	status_synced: "Sincronizado",
	status_syncing: "Sincronizando...",
	status_offline: "Desconectado",
	status_error: "Erro",
	status_unknown: "Desconhecido",

	info_last_sync: "Último Sync",
	info_devices: "Dispositivos Online",
	info_folder: "Pasta Monitorada",
	info_history: "Atividade Recente",
	history_empty: "Nenhuma atividade recente",

	// History Directions (Tooltips for arrows)
	history_incoming: "Recebido (Remoto)",
	history_outgoing: "Enviado (Local)",

	btn_sync_now: "Sincronizar Agora",
	btn_requesting: "Solicitando...",

	// Settings - Headers
	setting_header_conn: "Configurações de Conexão",
	setting_header_folder: "Pastas e Arquivos",
	setting_header_interface: "Interface",
	setting_header_general: "Geral",

	// Settings - General
	setting_lang_name: "Idioma",
	setting_lang_desc:
		"Force a interface do plugin para um idioma específico ou siga o Obsidian.",

	// Settings - Connection
	setting_https_name: "Usar HTTPS",
	setting_https_desc:
		"IMPORTANTE: Mantenha DESATIVADO para Android/Mobile funcionar corretamente, também deve estar desativado no syncthing. Só ative se você configurou certificados TLS válidos no Desktop.",
	setting_host_name: "Endereço IP / Host",
	setting_host_desc:
		'O endereço onde a interface do Syncthing roda. Use "127.0.0.1" para localhost.',
	setting_port_name: "Porta",
	setting_port_desc:
		"Padrão é 8384. Verifique nas configurações do Syncthing se você alterou.",
	setting_api_name: "Chave da API (API Key)",
	setting_api_desc:
		"Copie este código no Syncthing em: Ações > Configurações > Geral.",
	btn_test_conn: "Testar Conexão",

	// Settings - Folder
	setting_folder_name: "Pasta do Cofre",
	setting_folder_desc:
		"Selecione qual ID de pasta do Syncthing corresponde a este cofre do Obsidian para monitorar o status específico dele.",
	dropdown_default: "Selecione uma pasta...",
	dropdown_none: "Nenhuma selecionada",
	btn_search_folders: "Buscar pastas no Syncthing",

	// Settings - Conflict
	setting_modal_conflict_name: "Detecção de Conflitos",
	setting_modal_conflict_desc:
		'Ativa a busca automática por arquivos ".sync-conflict". Um alerta vermelho aparecerá no Painel Lateral se conflitos forem encontrados.',

	// Settings - Interface
	setting_status_bar_name: "Mostrar na Barra de Status",
	setting_status_bar_desc:
		"Exibe o ícone de conexão e status no rodapé direito (Apenas Desktop). Reinicie o obsidian para aplicar.",
	setting_ribbon_name: "Mostrar Ícone no Ribbon",
	setting_ribbon_desc:
		"Exibe o ícone na barra lateral esquerda para acesso rápido ao painel. Reinicie o obsidian para aplicar.",
	setting_tab_icon_name: "Mostrar status de sync nas abas",
	setting_tab_icon_desc:
		"Exibe um ícone na aba do arquivo enquanto ele está sendo sincronizado.",
	setting_explorer_icon_name: "Ícone no Gerenciador de Arquivos",
	setting_explorer_icon_desc:
		"Exibe um botão de sincronização ao passar o mouse sobre os arquivos na barra lateral.",

	// --- History Filter ---
	setting_history_filter_name: "Filtro de Histórico",
	setting_history_filter_desc:
		"Arquivos ou pastas para esconder do painel de histórico (separados por vírgula, ex: .Obsidian, .DS_Store).",

	// Notices / Errors
	notice_syncing: "Sincronização solicitada...",
	notice_success_conn: "Conexão realizada com sucesso! ID do Dispositivo: ",
	notice_fail_conn:
		"Falha na conexão. Verifique IP, Porta e se o HTTPS está desativado (especialmente no Android).",
	notice_error_auth: "Erro de Autenticação. Verifique sua API Key.",
	notice_offline: "Syncthing inacessível. O aplicativo está rodando?",
	notice_folders_found: "pastas encontradas.",
	notice_config_first: "Por favor, configure a API Key e a URL primeiro.",
	notice_searching: "Conectando ao Syncthing...",

	// Modal de Conflitos
	modal_conflict_title: "Resolver Conflitos de Sync",
	modal_conflict_empty:
		"Ótimo! Nenhum arquivo de conflito encontrado no cofre.",
	modal_conflict_desc:
		"Os arquivos abaixo possuem versões conflitantes. Compare o conteúdo e escolha qual manter.",
	btn_compare: "Comparar Conteúdo",
	btn_keep_original: "Manter Original",
	tooltip_keep_original:
		"Apaga o arquivo de conflito (da direita) e mantém o seu arquivo atual.",
	btn_keep_conflict: "Usar Versão do Conflito",
	tooltip_keep_conflict:
		"Substitui o seu arquivo local pela versão do conflito (da direita).",

	// Visualização de Diferença
	diff_original_header: "Arquivo Atual (Original)",
	diff_conflict_header: "Versão do Conflito",
	diff_loading: "Carregando conteúdo...",
	diff_original_missing:
		"(O arquivo original foi deletado ou não encontrado)",
	diff_read_error: "Erro ao ler o conteúdo do arquivo.",

	// Ignore (.stignore)
	setting_ignore_name: "Arquivos Ignorados (.stignore)",
	setting_ignore_desc:
		"Edite o arquivo .stignore para impedir que arquivos específicos (como configs de workspace) sejam sincronizados, evitando bagunça de layout.",
	btn_edit_ignore: "Editar .stignore",

	// Modal de Ignore
	modal_ignore_title: "Editar .stignore",
	modal_ignore_desc:
		"Arquivos ou padrões listados abaixo serão completamente ignorados pelo Syncthing.",
	header_ignore_templates: "Modelos Rápidos:",

	ignore_help_text:
		'Clique em "Adicionar" para incluir regras comuns que evitam problemas de sincronização entre Desktop e Mobile.',

	ignore_pattern_workspace_label: "Configurações de Workspace",
	ignore_pattern_workspace_desc:
		"Essencial! Ignora posições de janelas e abas abertas (evita conflitos visuais entre PC e Celular).",

	ignore_pattern_installer_label: "Cache do Instalador",
	ignore_pattern_installer_desc:
		"Ignora arquivos temporários de atualização do Obsidian.",

	ignore_pattern_hidden_label: "Arquivos Ocultos",
	ignore_pattern_hidden_desc:
		"Ignora arquivos de sistema (como .DS_Store no Mac ou thumbs.db no Windows).",

	btn_add_ignore: "Adicionar",
	btn_save_ignore: "Salvar Alterações",
	notice_ignore_saved: "Arquivo .stignore salvo com sucesso.",
	notice_ignore_exists: "Esta regra já está na lista.",
	notice_ignore_added: "Adicionado: ",
	notice_ignore_error: "Erro ao salvar .stignore",

	// Alerta de Conflito (View)
	alert_conflict_detected: "Conflito(s) Detectado(s)!",
	alert_click_to_resolve: "Clique aqui para resolver",

	// Placeholders
	explorer_sync_tooltip: "Sincronizar este arquivo",

	// About
	setting_header_about: "Sobre",
	setting_version_name: "Versão",
	setting_version_tooltip: "Ver notas da versão",
	setting_github_desc: "Acesse o código fonte ou reporte um problema.",
	btn_github_repo: "Repositório GitHub",
	btn_report_bug: "Reportar Bug",

	// Versões
	modal_versions_title: "Versões do Arquivo",
	modal_versions_empty: "Nenhuma versão anterior encontrada.",
	btn_restore: "Restaurar",
	notice_version_restored: "Versão restaurada com sucesso.",
	notice_restore_fail: "Falha ao restaurar versão.",
	confirm_restore:
		"Tem certeza que deseja restaurar a versão de {date}? O conteúdo atual será sobrescrito.",
	cmd_view_versions: "Versões de Arquivo",
	btn_cancel: "Cancelar",
	modal_confirm_title: "Confirmar Ação",

	// Menu de Contexto
	modal_context_menu_title: "Menu de Contexto",
	btn_manage_context_menu: "Gerenciar itens do menu de contexto",
	setting_group_context_menu_name: "Agrupar itens",
	setting_group_context_menu_desc:
		"Agrupa todos os itens do syncthing em um único submenu.",
	header_context_menu_items: "Itens",
	btn_view_version: "Ver conteúdo",
	cmd_sync_file: "Sincronizar arquivo",
};
