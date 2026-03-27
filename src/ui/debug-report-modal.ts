import { App, Modal, Notice, Platform, apiVersion } from "obsidian";
import SyncthingController from "../main";
import { SyncthingAPI } from "../api/syncthing-api";
import { Logger } from "../utils/logger";
import { t } from "../lang/lang";

/**
 * Modal que exibe o relatório de depuração e permite copiar ou abrir uma Issue no GitHub.
 */
export class DebugReportModal extends Modal {
	plugin: SyncthingController;
	private syncthingVersion: string = "unknown";

	constructor(app: App, plugin: SyncthingController) {
		super(app);
		this.plugin = plugin;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl("h2", { text: t("debug_report_title") });
		contentEl.createEl("p", { text: t("debug_report_desc") });

		// Busca versão do Syncthing e depois renderiza o conteúdo
		void this.fetchSyncthingVersion().then(() => {
			this.renderContent(contentEl);
		});
	}

	private async fetchSyncthingVersion() {
		try {
			const url = this.plugin.apiUrl;
			const apiKey = this.plugin.settings.syncthingApiKey;
			if (url && apiKey) {
				const ver = await SyncthingAPI.getSystemVersion(url, apiKey);
				this.syncthingVersion = ver.version || "unknown";
			}
		} catch {
			this.syncthingVersion = "unknown";
		}
	}

	private renderContent(contentEl: HTMLElement) {
		const report = this.buildReport();

		const textarea = contentEl.createEl("textarea", {
			cls: "st-debug-report-textarea",
		});
		textarea.value = report;
		textarea.readOnly = true;
		textarea.rows = 18;

		const buttonContainer = contentEl.createDiv({
			cls: "st-debug-report-buttons",
		});

		const copyBtn = buttonContainer.createEl("button", {
			text: t("debug_report_copy"),
			cls: "mod-cta",
		});
		copyBtn.addEventListener("click", () => {
			void (async () => {
				await navigator.clipboard.writeText(report);
				new Notice(t("debug_report_copied"));
			})();
		});

		const issueBtn = buttonContainer.createEl("button", {
			text: t("debug_report_open_issue"),
		});
		issueBtn.addEventListener("click", () => {
			const url = this.buildIssueUrl(report);
			window.open(url);
		});
	}

	onClose() {
		this.contentEl.empty();
	}

	/**
	 * Monta o relatório de depuração com informações do ambiente e erros recentes.
	 */
	private buildReport(): string {
		const lines: string[] = [];

		lines.push("=== Syncthing Manager — Debug Report ===");
		lines.push("");
		lines.push(`Syncthing: ${this.syncthingVersion}`);
		lines.push(`Plugin: v${this.plugin.manifest.version}`);
		lines.push(`Obsidian: v${this.getObsidianVersion()}`);
		lines.push(`Platform: ${this.getPlatformString()}`);
		lines.push(`Status: ${this.plugin.currentStatus}`);
		lines.push(`Devices: ${this.plugin.connectedDevices}`);
		lines.push(
			`Host: ${this.plugin.settings.syncthingHost}:${this.plugin.settings.syncthingPort}`,
		);
		lines.push(`HTTPS: ${this.plugin.settings.useHttps}`);
		lines.push(
			`Folder ID: ${this.plugin.settings.syncthingFolderId || "(not set)"}`,
		);
		lines.push("");

		const entries = Logger.getEntries();

		if (entries.length === 0) {
			lines.push(t("debug_report_no_errors"));
		} else {
			lines.push(`--- Recent Errors/Warnings (${entries.length}) ---`);
			lines.push("");
			for (const entry of entries) {
				const icon = entry.level === "error" ? "❌" : "⚠️";
				lines.push(
					`[${entry.timestamp}] ${icon} [${entry.module}] ${entry.message}`,
				);
				if (entry.details) {
					lines.push(`  └─ ${entry.details}`);
				}
			}
		}

		return lines.join("\n");
	}

	private getObsidianVersion(): string {
		return apiVersion || "unknown";
	}

	private getPlatformString(): string {
		if (Platform.isDesktopApp) {
			if (Platform.isMacOS) return "macOS";
			if (Platform.isWin) return "Windows";
			return "Linux";
		}
		if (Platform.isIosApp) return "iOS";
		if (Platform.isAndroidApp) return "Android";
		return "Unknown";
	}

	/**
	 * Monta a URL de criação de Issue no GitHub com campos pré-preenchidos
	 * usando os IDs do template bug_report.yml.
	 */
	private buildIssueUrl(report: string): string {
		const base =
			"https://github.com/gustjose/obsidian-syncthing-manager/issues/new";
		const params = new URLSearchParams();

		params.set("template", "bug_report.yml");
		params.set("obsidian_version", this.getObsidianVersion());
		params.set("syncthing_version", this.syncthingVersion);
		params.set("os", this.getPlatformString());

		// Limita os logs para evitar erro de URL muito longa (414 Request-URI Too Large)
		const MAX_LOG_CHARS = 1800;
		let truncatedLogs = report;

		if (report.length > MAX_LOG_CHARS) {
			const lines = report.split("\n");
			const headerLines = lines.slice(0, 14);
			const logLines = lines.slice(14);
			const lastLogs = logLines.slice(-15);

			truncatedLogs = [
				...headerLines,
				"",
				"... [LOGS TRUNCATED FOR URL LENGTH LIMITS] ...",
				"... [PLEASE PASTE THE FULL REPORT FROM THE MODAL BELOW] ...",
				"",
				...lastLogs,
			].join("\n");
		}

		params.set("logs", truncatedLogs);

		return `${base}?${params.toString()}`;
	}
}
