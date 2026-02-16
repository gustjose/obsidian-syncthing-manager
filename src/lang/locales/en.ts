export default {
	// Commands
	cmd_open_panel: "Open side panel",
	cmd_force_sync: "Force sync now",
	cmd_debug_connect: "Debug: test connection",

	// Ribbon Icon
	ribbon_tooltip: "Open syncthing manager",

	// Status / View
	status_synced: "Synced",
	status_syncing: "Syncing...",
	status_error: "Error",
	status_offline: "Offline",
	status_unknown: "Unknown",
	status_paused: "Paused",

	info_last_sync: "Last sync",
	info_devices: "Online devices",
	info_folder: "Vault folder",
	info_history: "Recent activity", // Garanti que esta chave existe para o título
	history_empty: "No recent activity", // Garanti que esta chave existe para lista vazia

	// History Directions (Tooltips for arrows)
	history_incoming: "Incoming (remote)",
	history_outgoing: "Outgoing (local)",

	btn_sync_now: "Sync now",
	btn_requesting: "Requesting...",
	tooltip_pause: "Pause sync",
	tooltip_resume: "Resume sync",

	// Settings - Headers
	setting_header_conn: "Connection settings",
	setting_header_folder: "Folder & files",
	setting_header_interface: "Interface options",
	setting_header_general: "General",

	// Settings - General
	setting_lang_name: "Language",
	setting_lang_desc:
		"Force the plugin interface to a specific language or follow Obsidian.",

	// Settings - Connection
	setting_https_name: "Use HTTPS",
	setting_https_desc:
		"Important: keep this disabled for Android/mobile to work correctly. Only enable if you have configured a valid TLS certificate on your desktop.",
	setting_host_name: "IP address / host",
	setting_host_desc:
		'The address where syncthing GUI is running. Use "127.0.0.1" for localhost.',
	setting_port_name: "Port",
	setting_port_desc:
		"Default is 8384. Check your syncthing GUI settings if you changed it.",
	setting_api_name: "API key",
	setting_api_desc:
		"Copy this from syncthing > actions > settings > general.",
	btn_test_conn: "Test connection",

	// Settings - Folder
	setting_folder_name: "Vault folder ID",
	setting_folder_desc:
		"Select the syncthing folder ID that matches this Obsidian vault to track its specific status.",
	dropdown_default: "Select a folder...",
	dropdown_none: "No folder selected",
	btn_search_folders: "Fetch folders from syncthing",

	// Settings - Conflict
	setting_modal_conflict_name: "Conflict detection",
	setting_modal_conflict_desc:
		'Enable automatic scanning for ".sync-conflict" files. A red alert will appear in the side panel if conflicts are found.',

	// Settings - Interface
	setting_status_bar_name: "Show status bar item",
	setting_status_bar_desc:
		"Displays the connection icon and quick actions in the bottom right status bar (desktop only).",
	setting_ribbon_name: "Show ribbon icon",
	setting_ribbon_desc:
		"Displays the icon in the left sidebar ribbon to quickly open the controller panel.",
	setting_tab_icon_name: "Show sync status in tabs",
	setting_tab_icon_desc: "Displays a icon in the file tab when syncing.",
	setting_explorer_icon_name: "File explorer icon",
	setting_explorer_icon_desc:
		"Show a sync button on hover next to files in the sidebar.",

	// --- History Filter ---
	setting_history_filter_name: "History filter",
	setting_history_filter_desc:
		"Files or folders to hide from the history panel (comma separated, e.g. .Obsidian, .ds_store).",

	// Notices / Errors
	notice_syncing: "Sync requested...",
	notice_success_conn: "Connection successful! Device ID: ",
	notice_fail_conn:
		"Connection failed. Please check the IP, port, and ensure HTTPS is disabled (especially on Android).",
	notice_error_auth: "Authentication failed. Please check your API key.",
	notice_offline: "Syncthing is unreachable. Is it running?",
	notice_folders_found: "Folders found.",
	notice_config_first: "Please configure the API key and URL first.",
	notice_searching: "Connecting to syncthing...",

	// Conflict Modal
	modal_conflict_title: "Resolve sync conflicts",
	modal_conflict_empty: "Great news! No conflict files found in your vault.",
	modal_conflict_desc:
		"The following files have conflicting versions. Compare the content and choose which one to keep.",
	btn_compare: "Compare content",
	btn_keep_original: "Keep original",
	tooltip_keep_original:
		"Deletes the conflict file (right side) and keeps your current local file.",
	btn_keep_conflict: "Use conflict version",
	tooltip_keep_conflict:
		"Overwrites your local file with the conflict version (right side).",

	// Diff View
	diff_original_header: "Current file (original)",
	diff_conflict_header: "Incoming conflict",
	diff_loading: "Loading file content...",
	diff_original_missing: "(original file was deleted or not found)",
	diff_read_error: "Error reading file content.",

	// Ignore (.stignore)
	setting_ignore_name: "Ignored files (.stignore)",
	setting_ignore_desc:
		"Edit the .stignore file to prevent specific files (like workspace layouts) from syncing between devices.",
	btn_edit_ignore: "Edit .stignore",

	// Ignore Modal
	modal_ignore_title: "Edit .stignore",
	modal_ignore_desc:
		"Files or patterns listed below will be completely ignored by syncthing.",
	header_ignore_templates: "Quick add templates:",
	btn_add_ignore: "Add",
	btn_save_ignore: "Save changes",
	notice_ignore_saved: ".stignore file saved successfully.",
	notice_ignore_exists: "This rule is already in the list.",
	ignore_help_text:
		'Click "add" to include common rules that prevent sync issues between desktop and mobile.',

	ignore_pattern_workspace_label: "Workspace config",
	ignore_pattern_workspace_desc:
		"Essential! Ignores open window positions and tabs (avoids visual conflicts between desktop and mobile).",

	ignore_pattern_installer_label: "Installer cache",
	ignore_pattern_installer_desc: "Ignores temporary Obsidian update files.",

	ignore_pattern_hidden_label: "Hidden files",
	ignore_pattern_hidden_desc:
		"Ignores system files (like .ds_store on mac or thumbs.db on Windows).",

	notice_ignore_added: "Added: ",
	notice_ignore_error: "Error saving .stignore",

	// Alerts
	alert_conflict_detected: "Conflict(s) detected!",
	alert_click_to_resolve: "Click here to resolve",

	// Placeholders
	explorer_sync_tooltip: "Sync this file",

	// About
	setting_header_about: "About",
	setting_version_name: "Version",
	setting_version_tooltip: "View release notes",
	setting_github_desc: "Access source code or report an issue.",
	btn_github_repo: "GitHub repo",
	btn_report_bug: "Report bug",

	// Versions
	modal_versions_title: "File versions",
	modal_versions_empty: "No previous versions found.",
	btn_restore: "Restore",
	notice_version_restored: "Version restored successfully.",
	notice_restore_fail: "Failed to restore version.",
	confirm_restore:
		"Are you sure you want to restore the version from {date}? Current content will be overwritten.",
	cmd_view_versions: "File versions",
	btn_cancel: "Cancel",
	modal_confirm_title: "Confirm action",

	// Context Menu
	modal_context_menu_title: "Context menu",
	btn_manage_context_menu: "Manage context menu items",
	setting_group_context_menu_name: "Group items",
	setting_group_context_menu_desc:
		"Group all syncthing items under a single submenu.",
	header_context_menu_items: "Items",
	btn_view_version: "View content",
	cmd_sync_file: "Sync file",
	// Debug
	setting_debug_mode_name: "Debug mode",
	setting_debug_mode_desc: "Enable verbose logging to console (dev).",
	tooltip_configure_modules: "Configure debug modules",
	modal_debug_title: "Debug configuration",
	modal_debug_desc:
		"Select which modules should output debug logs to the console.",
};
