import { App, Modal, Setting } from "obsidian";
import SyncthingController from "../main";
import { LOG_MODULES, Logger, LogEntry, LogLevel } from "../utils/logger";
import { t } from "../lang/lang";

/**
 * Modal com painel visual de logs em tempo real (console de debug interno).
 */
export class DebugConsoleModal extends Modal {
	plugin: SyncthingController;
	private listEl: HTMLElement;
	private unsubscribe: (() => void) | null = null;
	private filterLevel: "error" | "warn" | "debug" = "debug";
	private filterModules: Set<string>;

	constructor(app: App, plugin: SyncthingController) {
		super(app);
		this.plugin = plugin;
		this.filterModules = new Set(Object.values(LOG_MODULES));
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		this.modalEl.addClass("st-debug-console-modal");

		contentEl.createEl("h2", { text: t("debug_console_title") });

		// Filtros
		const filterBar = contentEl.createDiv({
			cls: "st-debug-console-filters",
		});

		// Dropdown de nível mínimo
		new Setting(filterBar)
			.setName(t("debug_console_filter_level"))
			.addDropdown((dd) => {
				dd.addOption("debug", "DEBUG");
				dd.addOption("warn", "WARN");
				dd.addOption("error", "ERROR");
				dd.setValue(this.filterLevel);
				dd.onChange((value) => {
					this.filterLevel = value as "error" | "warn" | "debug";
					this.renderEntries();
				});
			});

		// Checkboxes de módulos
		const modulesContainer = filterBar.createDiv({
			cls: "st-debug-console-modules",
		});
		modulesContainer.createEl("span", {
			text: t("debug_console_filter_modules"),
			cls: "st-debug-console-modules-label setting-item-name",
		});

		const modulesList = modulesContainer.createDiv({
			cls: "st-debug-console-modules-list",
		});
		Object.values(LOG_MODULES).forEach((mod) => {
			const label = modulesList.createEl("label", {
				cls: "st-debug-console-module-item",
			});
			const checkbox = label.createEl("input", { type: "checkbox" });
			checkbox.checked = this.filterModules.has(mod);
			checkbox.addEventListener("change", () => {
				if (checkbox.checked) {
					this.filterModules.add(mod);
				} else {
					this.filterModules.delete(mod);
				}
				this.renderEntries();
			});
			label.appendText(` ${mod}`);
		});

		// Lista de logs
		this.listEl = contentEl.createDiv({ cls: "st-debug-console-list" });

		// Botão limpar
		const footer = contentEl.createDiv({ cls: "st-debug-console-footer" });
		const clearBtn = footer.createEl("button", {
			text: t("debug_console_clear"),
		});
		clearBtn.addEventListener("click", () => {
			Logger.clearBuffer();
			this.renderEntries();
		});

		// Renderiza entradas existentes
		this.renderEntries();

		// Escuta novas entradas em tempo real
		this.unsubscribe = Logger.onNewEntry((entry) => {
			if (this.shouldShow(entry)) {
				this.appendEntry(entry);
				this.listEl.scrollTop = this.listEl.scrollHeight;
			}
		});
	}

	onClose() {
		if (this.unsubscribe) {
			this.unsubscribe();
			this.unsubscribe = null;
		}
		this.contentEl.empty();
	}

	private renderEntries() {
		this.listEl.empty();
		const entries = Logger.getEntries().filter((e) => this.shouldShow(e));

		if (entries.length === 0) {
			this.listEl.createDiv({
				text: t("debug_console_empty"),
				cls: "st-debug-console-empty",
			});
			return;
		}

		for (const entry of entries) {
			this.appendEntry(entry);
		}

		this.listEl.scrollTop = this.listEl.scrollHeight;
	}

	private shouldShow(entry: LogEntry): boolean {
		if (!this.filterModules.has(entry.module)) return false;

		const levelPriority: Record<string, number> = {
			error: 1,
			warn: 2,
			debug: 3,
		};

		return levelPriority[entry.level] <= levelPriority[this.filterLevel];
	}

	private appendEntry(entry: LogEntry) {
		const row = this.listEl.createDiv({
			cls: `st-debug-console-entry st-log-${entry.level}`,
		});

		const time = new Date(entry.timestamp).toLocaleTimeString([], {
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
		});

		row.createSpan({ text: time, cls: "st-debug-console-time" });
		row.createSpan({
			text: entry.level.toUpperCase(),
			cls: `st-debug-console-level st-log-level-${entry.level}`,
		});
		row.createSpan({
			text: `[${entry.module}]`,
			cls: "st-debug-console-module",
		});
		row.createSpan({ text: entry.message, cls: "st-debug-console-msg" });

		if (entry.details) {
			row.createDiv({
				text: `  └─ ${entry.details}`,
				cls: "st-debug-console-details",
			});
		}
	}
}

export type { LogLevel };
