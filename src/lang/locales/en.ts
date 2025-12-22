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
	status_offline: "Offline",
	status_error: "Error",
	status_unknown: "Unknown",

	info_last_sync: "Last sync",
	info_devices: "Online devices",
	info_folder: "Vault folder",
	btn_sync_now: "Sync now",
	btn_requesting: "Requesting...",

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

	// Alerts
	alert_conflict_detected: "Conflict(s) detected!",
	alert_click_to_resolve: "Click here to resolve",
};
