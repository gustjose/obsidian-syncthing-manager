/**
 * Mock manual do módulo 'obsidian' para uso em testes unitários.
 * Fornece stubs minimalistas das APIs usadas pelo plugin.
 */
import { vi } from "vitest";

// --- requestUrl ---
export const requestUrl = vi.fn();

// --- Plugin ---
export class Plugin {
	app: App;
	manifest = { dir: ".obsidian/plugins/syncthing-manager" };

	constructor() {
		this.app = new App();
	}

	loadData = vi.fn().mockResolvedValue({});
	saveData = vi.fn().mockResolvedValue(undefined);
	registerEvent = vi.fn();
	addCommand = vi.fn();
	addSettingTab = vi.fn();
	addRibbonIcon = vi.fn();
}

// --- App ---
export class App {
	vault = {
		adapter: {
			exists: vi.fn().mockResolvedValue(false),
			read: vi.fn().mockResolvedValue("{}"),
			write: vi.fn().mockResolvedValue(undefined),
		},
		configDir: ".obsidian",
	};
	workspace = {
		on: vi.fn(),
		onLayoutReady: vi.fn(),
		iterateAllLeaves: vi.fn(),
	};
	secretStorage?: {
		setSecret: ReturnType<typeof vi.fn>;
		getSecret: ReturnType<typeof vi.fn>;
		listSecrets: ReturnType<typeof vi.fn>;
	};
}

// --- Component ---
export class Component {
	load = vi.fn();
	unload = vi.fn();
	addChild = vi.fn();
	removeChild = vi.fn();
	register = vi.fn();
	registerEvent = vi.fn();
	registerInterval = vi.fn();
}

// --- debounce ---
export function debounce<T extends (...args: unknown[]) => unknown>(
	fn: T,
	_delay?: number,
	_immediate?: boolean,
): T {
	return fn;
}

// --- Stubs de UI (não usados nos testes, mas necessários para imports) ---
export class Modal {
	app: App;
	contentEl = { empty: vi.fn(), createEl: vi.fn(), createDiv: vi.fn() };
	constructor(app: App) {
		this.app = app;
	}
	open = vi.fn();
	close = vi.fn();
}

export class Setting {
	constructor(_containerEl: unknown) {}
	setName = vi.fn().mockReturnThis();
	setDesc = vi.fn().mockReturnThis();
	setHeading = vi.fn().mockReturnThis();
	addText = vi.fn().mockReturnThis();
	addToggle = vi.fn().mockReturnThis();
	addButton = vi.fn().mockReturnThis();
	addDropdown = vi.fn().mockReturnThis();
	controlEl = { createSpan: vi.fn() };
}

export class PluginSettingTab {
	app: App;
	containerEl = { empty: vi.fn() };
	constructor(app: App, _plugin: Plugin) {
		this.app = app;
	}
	display = vi.fn();
}

export class TFile {
	path: string = "";
	name: string = "";
	basename: string = "";
	extension: string = "";
}

export class TFolder {
	path: string = "";
	name: string = "";
	children: unknown[] = [];
}

export class FileView {
	file: TFile | null = null;
}

export class ButtonComponent {
	constructor(_containerEl: unknown) {}
	setButtonText = vi.fn().mockReturnThis();
	setCta = vi.fn().mockReturnThis();
	onClick = vi.fn().mockReturnThis();
}

export class TextComponent {
	inputEl = { type: "", addClass: vi.fn(), setCssStyles: vi.fn() };
	constructor(_containerEl: unknown) {}
	setValue = vi.fn().mockReturnThis();
	getValue = vi.fn().mockReturnValue("");
	setPlaceholder = vi.fn().mockReturnThis();
	onChange = vi.fn().mockReturnThis();
}

export class Menu {
	addItem = vi.fn().mockReturnThis();
}

export type MenuItem = unknown;

export function setIcon(_el: unknown, _iconId: string): void {}

export class WorkspaceLeaf {
	view: unknown = {};
}

export function requireApiVersion(_version: string): boolean {
	return false;
}
