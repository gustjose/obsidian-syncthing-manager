import { Plugin } from "obsidian";
import {
	SyncthingPluginSettings,
	DEFAULT_SETTINGS,
	LS_KEY_HOST,
	LS_KEY_PORT,
	LS_KEY_HTTPS,
} from "../types";
import { SecretManager } from "./secret-manager";

/**
 * Gerencia o carregamento e persistência das configurações do plugin.
 * Configurações device-specific (host, port, https) ficam no localStorage.
 * A API key é gerenciada pelo SecretManager (Keychain ou localStorage).
 */
export class SettingsManager {
	private plugin: Plugin;
	private secretManager: SecretManager;

	constructor(plugin: Plugin, secretManager: SecretManager) {
		this.plugin = plugin;
		this.secretManager = secretManager;
	}

	async loadSettings(): Promise<SyncthingPluginSettings> {
		const rawData = (await this.plugin.loadData()) as unknown;
		const loadedData = rawData as Partial<SyncthingPluginSettings>;

		const settings = Object.assign({}, DEFAULT_SETTINGS, loadedData);

		// Migração: Garante que usuários que já possuem o plugin tenham o novo item "ignore_file" inserido nas listas de menus
		if (!settings.hasMigratedIgnoreContextMenu) {
			if (!settings.enabledContextMenuItems.includes("ignore_file")) {
				settings.enabledContextMenuItems.push("ignore_file");
			}
			settings.hasMigratedIgnoreContextMenu = true;
			void this.plugin.saveData(
				Object.assign({}, settings, {
					syncthingHost: "device-specific",
					syncthingPort: "device-specific",
					syncthingApiKey: "device-specific",
					useHttps: false,
				}),
			);
		}

		// Limpa placeholders antigos se existirem
		if (settings.syncthingHost === "device-specific")
			settings.syncthingHost = "";
		if (settings.syncthingPort === "device-specific")
			settings.syncthingPort = "";

		// Carrega do LocalStorage (específico do dispositivo)
		const localHost = window.localStorage.getItem(LS_KEY_HOST);
		const localPort = window.localStorage.getItem(LS_KEY_PORT);
		const localHttps = window.localStorage.getItem(LS_KEY_HTTPS);

		if (localHost) settings.syncthingHost = localHost;
		if (localPort) settings.syncthingPort = localPort;
		if (localHttps !== null) settings.useHttps = localHttps === "true";

		// Migra API key para o Keychain se possível
		this.secretManager.migrateIfNeeded();

		// Carrega API key via SecretManager (Keychain → localStorage fallback)
		settings.syncthingApiKey = this.secretManager.loadApiKey();

		return settings;
	}

	async saveSettings(settings: SyncthingPluginSettings): Promise<void> {
		// 1. Salva configurações compartilhadas no data.json
		const sharedSettings = {
			updateInterval: settings.updateInterval,
			showStatusBar: settings.showStatusBar,
			showRibbonIcon: settings.showRibbonIcon,
			language: settings.language,
			modalConflict: settings.modalConflict,
			showTabIcon: settings.showTabIcon,
			showExplorerIcon: settings.showExplorerIcon,
			ignoredPaths: settings.ignoredPaths,
			syncthingFolderId: settings.syncthingFolderId,
			syncthingFolderLabel: settings.syncthingFolderLabel,
			enabledContextMenuItems: settings.enabledContextMenuItems,
			groupContextMenuItems: settings.groupContextMenuItems,
			hasMigratedIgnoreContextMenu: settings.hasMigratedIgnoreContextMenu,
			debugMode: settings.debugMode,
			debugModules: settings.debugModules,
			syncthingHost: "device-specific",
			syncthingPort: "device-specific",
			useHttps: false,
			syncthingApiKey: "device-specific",
		};
		await this.plugin.saveData(sharedSettings);

		// 2. Salva configurações locais do dispositivo
		window.localStorage.setItem(LS_KEY_HOST, settings.syncthingHost);
		window.localStorage.setItem(LS_KEY_PORT, settings.syncthingPort);
		window.localStorage.setItem(LS_KEY_HTTPS, String(settings.useHttps));

		// 3. Salva API key via SecretManager (Keychain + localStorage fallback)
		this.secretManager.saveApiKey(settings.syncthingApiKey);
	}
}
