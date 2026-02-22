import { App } from "obsidian";
import { LS_KEY_API, SECRET_KEY_API } from "../types";
import { Logger, LOG_MODULES } from "../utils/logger";

/**
 * Gerencia o armazenamento seguro da API key do Syncthing.
 * Usa a API nativa de Keychain do Obsidian (v1.11.4+) quando disponível,
 * com fallback para localStorage em versões mais antigas.
 */
export class SecretManager {
	private app: App;

	constructor(app: App) {
		this.app = app;
	}

	/** Verifica se o Obsidian possui suporte à API de secrets (Keychain). */
	get hasKeychainSupport(): boolean {
		return !!this.app.secretStorage;
	}

	/**
	 * Carrega a API key do armazenamento.
	 * Prioriza o Keychain quando suportado, com fallback para localStorage.
	 */
	loadApiKey(): string {
		if (this.hasKeychainSupport) {
			try {
				const secret =
					this.app.secretStorage!.getSecret(SECRET_KEY_API);
				if (secret) return secret;
			} catch (e) {
				Logger.warn(
					LOG_MODULES.MAIN,
					"Falha ao carregar secret do Keychain, usando fallback",
					e,
				);
			}
		}

		return window.localStorage.getItem(LS_KEY_API) || "";
	}

	/**
	 * Salva a API key no armazenamento.
	 * Usa o Keychain quando suportado e mantém localStorage como fallback.
	 */
	saveApiKey(value: string): void {
		if (this.hasKeychainSupport) {
			try {
				this.app.secretStorage!.setSecret(SECRET_KEY_API, value);
			} catch (e) {
				Logger.warn(
					LOG_MODULES.MAIN,
					"Falha ao salvar secret no Keychain",
					e,
				);
			}
		}

		window.localStorage.setItem(LS_KEY_API, value);
	}

	/**
	 * Migra silenciosamente a API key do localStorage para o Keychain.
	 * Executado automaticamente durante o carregamento das configurações.
	 */
	migrateIfNeeded(): void {
		if (!this.hasKeychainSupport) return;

		try {
			const keychainValue =
				this.app.secretStorage!.getSecret(SECRET_KEY_API);
			if (keychainValue) return;

			const localValue = window.localStorage.getItem(LS_KEY_API);
			if (!localValue) return;

			this.app.secretStorage!.setSecret(SECRET_KEY_API, localValue);
			window.localStorage.removeItem(LS_KEY_API);

			Logger.debug(
				LOG_MODULES.MAIN,
				"API key migrada com sucesso do localStorage para o Keychain",
			);
		} catch (e) {
			Logger.warn(
				LOG_MODULES.MAIN,
				"Falha na migração da API key para o Keychain",
				e,
			);
		}
	}
}
