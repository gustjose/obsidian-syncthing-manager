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
	enabledContextMenuItems: string[];
	groupContextMenuItems: boolean;
	debugMode: boolean;
	debugModules: string[];
	logLevel: "off" | "error" | "warn" | "debug";
}

export type SyncStatus =
	| "conectado"
	| "sincronizando"
	| "escutando"
	| "pausado"
	| "desconectado"
	| "erro"
	| "configurando"
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
	enabledContextMenuItems: ["view_file_versions", "sync_file"],
	groupContextMenuItems: false,
	debugMode: false,
	debugModules: ["Main", "API", "FileStateManager"],
	logLevel: "debug",
};

// Local Storage Keys
export const LS_KEY_HOST = "syncthing-controller-host";
export const LS_KEY_PORT = "syncthing-controller-port";
export const LS_KEY_HTTPS = "syncthing-controller-https";
export const LS_KEY_API = "syncthing-controller-api-key";
export const LS_KEY_FOLDER = "syncthing-controller-folder-id";
export const LS_KEY_FOLDER_LABEL = "syncthing-controller-folder-label";

// Keychain Secret Key
export const SECRET_KEY_API = "syncthing-api-key";

/**
 * Module augmentation para a API de secrets do Obsidian (v1.11.4+).
 * `app.secretStorage` pode não existir em versões mais antigas do Obsidian,
 * portanto deve ser verificado em runtime antes do uso.
 */
declare module "obsidian" {
	interface App {
		secretStorage?: {
			setSecret(id: string, secret: string): void;
			getSecret(id: string): string | null;
			listSecrets(): string[];
		};
	}

	interface Workspace {
		on(name: "syncthing:status-changed", callback: () => void): EventRef;
	}
}
