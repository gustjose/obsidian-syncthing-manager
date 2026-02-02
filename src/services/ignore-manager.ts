import { App } from "obsidian";
import { Logger, LOG_MODULES } from "../utils/logger";
import SyncthingController from "../main";
import { SyncthingAPI } from "../api/syncthing-api";

export class IgnoreManager {
	app: App;
	plugin: SyncthingController;

	constructor(app: App, plugin: SyncthingController) {
		this.app = app;
		this.plugin = plugin;
	}

	/**
	 * Verifica e atualiza as regras de ignore via API.
	 * Deve ser chamado APÓS o detectPathPrefix().
	 */
	async ensureDefaults() {
		if (
			!this.plugin.settings.syncthingApiKey ||
			!this.plugin.settings.syncthingFolderId
		) {
			Logger.warn(
				LOG_MODULES.MAIN,
				"Ignorando configuração de .stignore: API Key ou Folder ID ausentes.",
			);
			return;
		}

		try {
			// 1. Obtém as regras atuais do Syncthing
			const currentIgnores = await SyncthingAPI.getIgnores(
				this.plugin.apiUrl,
				this.plugin.settings.syncthingApiKey,
				this.plugin.settings.syncthingFolderId,
			);

			const currentLines = currentIgnores.ignore || [];

			// 2. Define as regras que NÓS queremos garantir
			// Nota: Usamos o pathPrefix para apontar corretamente para a subpasta
			const prefix = this.plugin.pathPrefix || ""; // ex: "dev-obsidian/"
			const configDir = this.app.vault.configDir;

			// Função auxiliar para garantir barras normais (Unix)
			const join = (p: string) => (prefix + p).replace(/\\/g, "/");

			const requiredRules = [
				"# --- Syncthing Controller Plugin Data ---",
				join(`${configDir}/plugins/syncthing-manager/sync-state.json`),
				join(
					`${configDir}/plugins/syncthing-manager/sync-state.sync-conflict*`,
				),
				join(
					`${configDir}/plugins/syncthing-manager/~syncthing~sync-state.json.tmp`,
				),
				// Regra de segurança genérica (com prefixo)
				join("**/sync-state.json"),
			];

			// 3. Mescla as regras
			let newLines = [...currentLines];
			let modified = false;

			// Adiciona cabeçalho se não existir
			if (
				!newLines.some((l) =>
					l.includes("Syncthing Controller Plugin Data"),
				)
			) {
				newLines.push(""); // Linha em branco
				newLines.push("# --- Syncthing Controller Plugin Data ---");
				modified = true;
			}

			for (const rule of requiredRules) {
				if (rule.startsWith("#")) continue;

				// Verifica se a regra já existe
				if (!newLines.includes(rule)) {
					newLines.push(rule);
					modified = true;
				}
			}

			// 4. Salva via API se houver mudança
			if (modified) {
				await SyncthingAPI.setIgnores(
					this.plugin.apiUrl,
					this.plugin.settings.syncthingApiKey,
					this.plugin.settings.syncthingFolderId,
					newLines,
				);
				Logger.debug(
					LOG_MODULES.MAIN,
					"Regras de ignore atualizadas via API.",
				);
			} else {
				Logger.debug(
					LOG_MODULES.MAIN,
					"Regras de ignore já estão atualizadas.",
				);
			}
		} catch (e) {
			Logger.error(
				LOG_MODULES.MAIN,
				"Falha ao atualizar ignores via API",
				e,
			);
		}
	}

	/**
	 * Carrega as regras atuais da API e retorna como uma única string.
	 * Usado pelo IgnoreModal.
	 */
	async loadRules(): Promise<string> {
		if (
			!this.plugin.settings.syncthingApiKey ||
			!this.plugin.settings.syncthingFolderId
		) {
			throw new Error("Configuração do Syncthing incompleta.");
		}

		const result = await SyncthingAPI.getIgnores(
			this.plugin.apiUrl,
			this.plugin.settings.syncthingApiKey,
			this.plugin.settings.syncthingFolderId,
		);

		return (result.ignore || []).join("\n");
	}

	/**
	 * Salva a string do editor de texto de volta para a API.
	 * Usado pelo IgnoreModal.
	 */
	async saveRules(content: string): Promise<void> {
		if (
			!this.plugin.settings.syncthingApiKey ||
			!this.plugin.settings.syncthingFolderId
		) {
			throw new Error("Configuração do Syncthing incompleta.");
		}

		// Quebra as linhas e remove vazias
		const lines = content
			.split("\n")
			.map((line) => line.trim())
			.filter((line) => line.length > 0);

		await SyncthingAPI.setIgnores(
			this.plugin.apiUrl,
			this.plugin.settings.syncthingApiKey,
			this.plugin.settings.syncthingFolderId,
			lines,
		);

		Logger.debug(
			LOG_MODULES.MAIN,
			"Regras de ignore atualizadas manualmente via Modal.",
		);
	}
}
