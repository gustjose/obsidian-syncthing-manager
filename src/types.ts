// --- Interfaces ---

export interface AppWithCommands {
	commands: { executeCommandById: (id: string) => boolean };
}

export interface SyncthingPluginSettings {
	syncthingHost: string;
	syncthingPort: string;
	useHttps: boolean;
	syncthingApiKey: string;
	syncthingFolderId: string;
	syncthingFolderLabel: string;

	updateInterval: number;
	showStatusBar: boolean;
	showRibbonIcon: boolean;
	language: string;
	modalConflict: boolean;
	showTabIcon: boolean;
	ignoredPaths: string;
	showExplorerIcon: boolean;
}

export type SyncStatus =
	| "conectado"
	| "sincronizando"
	| "escutando"
	| "desconectado"
	| "erro"
	| "desconhecido";

// --- Constants & Defaults ---

export const DEFAULT_SETTINGS: SyncthingPluginSettings = {
	syncthingHost: "127.0.0.1",
	syncthingPort: "8384",
	useHttps: false,
	syncthingApiKey: "",
	syncthingFolderId: "",
	syncthingFolderLabel: "",
	updateInterval: 30,
	showStatusBar: true,
	showRibbonIcon: true,
	language: "auto",
	modalConflict: true,
	showTabIcon: true,
	showExplorerIcon: true,
	ignoredPaths: "",
};

// Local Storage Keys
export const LS_KEY_HOST = "syncthing-controller-host";
export const LS_KEY_PORT = "syncthing-controller-port";
export const LS_KEY_HTTPS = "syncthing-controller-https";
export const LS_KEY_API = "syncthing-controller-api-key";
export const LS_KEY_FOLDER = "syncthing-controller-folder-id";
export const LS_KEY_FOLDER_LABEL = "syncthing-controller-folder-label";
