import { Plugin } from "obsidian";
import {
	SyncthingPluginSettings,
	DEFAULT_SETTINGS,
	LS_KEY_HOST,
	LS_KEY_PORT,
	LS_KEY_HTTPS,
	LS_KEY_API,
} from "../types";

export class SettingsManager {
	private plugin: Plugin;

	constructor(plugin: Plugin) {
		this.plugin = plugin;
	}

	async loadSettings(): Promise<SyncthingPluginSettings> {
		// CORREÇÃO: Cast para unknown primeiro para remover o 'any',
		// depois para Partial<SyncthingPluginSettings>
		const rawData = (await this.plugin.loadData()) as unknown;
		const loadedData = rawData as Partial<SyncthingPluginSettings>;

		// Object.assign agora infere corretamente que o resultado é SyncthingPluginSettings
		const settings = Object.assign({}, DEFAULT_SETTINGS, loadedData);

		// Limpa placeholders antigos se existirem
		if (settings.syncthingHost === "device-specific")
			settings.syncthingHost = "";
		if (settings.syncthingPort === "device-specific")
			settings.syncthingPort = "";

		// Carrega do LocalStorage (específico do dispositivo)
		const localHost = window.localStorage.getItem(LS_KEY_HOST);
		const localPort = window.localStorage.getItem(LS_KEY_PORT);
		const localHttps = window.localStorage.getItem(LS_KEY_HTTPS);
		const localKey = window.localStorage.getItem(LS_KEY_API);

		if (localHost) settings.syncthingHost = localHost;
		if (localPort) settings.syncthingPort = localPort;
		if (localHttps !== null) settings.useHttps = localHttps === "true";
		if (localKey) settings.syncthingApiKey = localKey;

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
			ignoredPaths: settings.ignoredPaths,
			syncthingFolderId: settings.syncthingFolderId,
			syncthingFolderLabel: settings.syncthingFolderLabel,
			syncthingHost: "device-specific",
			syncthingPort: "device-specific",
			useHttps: false,
			syncthingApiKey: "device-specific",
		};
		await this.plugin.saveData(sharedSettings);

		// 2. Salva configurações sensíveis/locais no LocalStorage
		window.localStorage.setItem(LS_KEY_HOST, settings.syncthingHost);
		window.localStorage.setItem(LS_KEY_PORT, settings.syncthingPort);
		window.localStorage.setItem(LS_KEY_HTTPS, String(settings.useHttps));
		window.localStorage.setItem(LS_KEY_API, settings.syncthingApiKey);
	}
}
