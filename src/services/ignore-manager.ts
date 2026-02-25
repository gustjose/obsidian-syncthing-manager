import { App } from "obsidian";
import { Logger, LOG_MODULES } from "../utils/logger";
import SyncthingController from "../main";
import { SyncthingAPI } from "../api/syncthing-api";

export class IgnoreManager {
	app: App;
	plugin: SyncthingController;
	cachedIgnores: string[] = [];

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
			this.cachedIgnores = currentLines; // Hydrate cache on startup

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

		const rules = result.ignore || [];
		this.cachedIgnores = rules; // Update cache
		return rules.join("\n");
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

		// Quebra as linhas e remove espacos do final, mas preserva linhas em branco originais
		const lines = content.split("\n").map((line) => line.trimEnd());

		await SyncthingAPI.setIgnores(
			this.plugin.apiUrl,
			this.plugin.settings.syncthingApiKey,
			this.plugin.settings.syncthingFolderId,
			lines,
		);

		this.cachedIgnores = lines; // Update cache

		Logger.debug(
			LOG_MODULES.MAIN,
			"Regras de ignore atualizadas manualmente via Modal.",
		);
	}

	/**
	 * Adiciona uma nova regra ao .stignore do Syncthing.
	 * Converte caminhos locais do Obsidian no caminho de contexto do Syncthing (considerando pathPrefix).
	 */
	async addIgnoreRule(
		obsidianPath: string,
		isFolder: boolean,
	): Promise<boolean> {
		if (
			!this.plugin.settings.syncthingApiKey ||
			!this.plugin.settings.syncthingFolderId
		) {
			Logger.warn(
				LOG_MODULES.MAIN,
				"Falha ao adicionar ignore: configuração da pasta não encontrada.",
			);
			return false;
		}

		try {
			// 1. Carrega todas as regras atuais da API
			const currentRulesStr = await this.loadRules();

			// 2. Transforma as regras numa array com base na quebra de linha
			const lines = currentRulesStr
				? currentRulesStr.split("\n").map((line) => line.trimEnd())
				: [];

			// 3. Monta o caminho novo combinando pathPrefix e finalizando com barra "/" no caso de diretórios
			const prefix = this.plugin.pathPrefix || "";
			let newRule = (prefix + obsidianPath).replace(/\\/g, "/");

			// O Syncthing processa pastas e arquivos da mesma forma. Adicionar "/" no
			// final pode fazer com que a pasta vazia seja criada no outro lado.
			// Portanto, enviamos o caminho limpo tanto para arquivos quanto pastas.

			// Previne prefixos usando barra principal de forma absoluta (o stignore na doc do Syncthing adota "/pasta/" como pattern a partir da raiz da sincronização)
			// Porém se o path dentro do syncthing já inicia de um nome de arquivo/pasta como `dev-obsidian/` inserimos sem a barra.
			if (!newRule.startsWith("/") && (prefix === "" || prefix === "/")) {
				newRule = "/" + newRule;
			}

			// 4. Verifica se já existe para evitar duplicatas
			if (lines.includes(newRule)) {
				Logger.debug(
					LOG_MODULES.MAIN,
					`[IgnoreManager] a regra '${newRule}' já consta no arquivo.`,
				);
				return true; // Considerado sucesso pois o fim atingido é o mesmo
			}

			// 5. Adiciona a nova linha
			lines.push(`${newRule}`);

			// 6. Envia o conjunto de regras via API e salva
			await SyncthingAPI.setIgnores(
				this.plugin.apiUrl,
				this.plugin.settings.syncthingApiKey,
				this.plugin.settings.syncthingFolderId,
				lines,
			);

			this.cachedIgnores = lines; // Update cache

			Logger.debug(
				LOG_MODULES.MAIN,
				`[IgnoreManager] O caminho '${newRule}' foi adicionado usando menu de contexto.`,
			);
			return true;
		} catch (error) {
			Logger.error(
				LOG_MODULES.MAIN,
				"[IgnoreManager] Falha ao adicionar regra no .stignore via menu de contexto",
				error,
			);
			return false;
		}
	}

	/**
	 * Retorna se o caminho está presente atualmente no .stignore cacheado.
	 * Usado para desabilitar o item no menu de contexto.
	 */
	isIgnored(obsidianPath: string): boolean {
		const prefix = this.plugin.pathPrefix || "";
		let ruleCheck = (prefix + obsidianPath).replace(/\\/g, "/");

		// Regra pura
		if (this.cachedIgnores.includes(ruleCheck)) return true;

		// Regra com barra inicial se aplicável localmente
		if (!ruleCheck.startsWith("/") && (prefix === "" || prefix === "/")) {
			if (this.cachedIgnores.includes("/" + ruleCheck)) return true;
		}

		return false;
	}
}
