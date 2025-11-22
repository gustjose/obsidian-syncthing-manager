export default {
    // Comandos
    cmd_open_panel: 'Open Side Panel',
    cmd_force_sync: 'Force Sync Now',
    cmd_debug_connect: 'Debug: Test Connection',

    // Ribbon
    ribbon_tooltip: 'Open Syncthing Controller',

    // Status / View
    status_synced: 'Synced',
    status_syncing: 'Syncing...',
    status_offline: 'Offline',
    status_error: 'Error',
    status_unknown: 'Unknown',
    
    info_last_sync: 'Last Sync',
    info_devices: 'Online Devices',
    info_folder: 'Folder',
    btn_sync_now: 'Sync Now',
    btn_requesting: 'Requesting...',

    // Settings - Headers
    setting_header_conn: 'Connection',
    setting_header_folder: 'Folder Monitoring',
    setting_header_interface: 'Interface',
    setting_header_general: 'General',

    // Settings - General
    setting_lang_name: 'Language',
    setting_lang_desc: 'Force a specific language or use Auto.',

    // Settings - Connection
    setting_https_name: 'Use HTTPS',
    setting_https_desc: 'Enable if your Syncthing GUI uses secure connection (TLS). Usually disabled for localhost.',
    setting_host_name: 'IP Address / Host',
    setting_host_desc: 'Default: 127.0.0.1 (localhost).',
    setting_port_name: 'Port',
    setting_port_desc: 'Default: 8384.',
    setting_api_name: 'API Key',
    setting_api_desc: 'Find it in Syncthing > Actions > Settings > General.',
    btn_test_conn: 'Test Connection',
    
    // Settings - Folder
    setting_folder_name: 'Vault Folder',
    setting_folder_desc: 'Select which Syncthing folder corresponds to this Obsidian Vault.',
    dropdown_default: 'Select a folder',
    dropdown_none: 'None selected',
    btn_search_folders: 'Search folders (uses connection settings above)',

    // Settings - Interface
    setting_status_bar_name: 'Show in Status Bar',
    setting_status_bar_desc: 'Desktop only. Reload to apply.',
    setting_ribbon_name: 'Show Ribbon Icon',
    setting_ribbon_desc: 'Left sidebar icon (Desktop/Mobile). Reload to apply.',

    // Notices / Errors
    notice_syncing: 'Syncing...',
    notice_success_conn: 'Success! Connected to ID: ',
    notice_fail_conn: 'Connection failed. Check IP, Port and HTTPS.',
    notice_error_auth: 'Authentication Error.',
    notice_offline: 'Syncthing Offline.',
    notice_folders_found: 'folders found!',
    notice_config_first: 'Configure URL and API Key first.',
    notice_searching: 'Searching folders...',

    // Conflict Modal
    modal_conflict_title: 'Resolve Conflicts',
    modal_conflict_empty: 'No conflict files found. All clean!',
    modal_conflict_desc: 'Choose which version you want to keep.',
    btn_compare: 'Compare Content',
    btn_keep_original: 'Keep Original',
    tooltip_keep_original: 'Deletes the conflict file (right side) and keeps the current one.',
    btn_keep_conflict: 'Use This Version',
    tooltip_keep_conflict: 'Replaces the original file with this conflict version.',
    
    // Diff View
    diff_original_header: 'Original File (Current)',
    diff_conflict_header: 'Conflict Version',
    diff_loading: 'Loading...',
    diff_original_missing: '(Original file not found or deleted)',
    diff_read_error: 'Error reading file.'
};