import { Plugin } from "obsidian";
import { SyncStatus } from "../types";
import { t } from "../lang/lang";
import { createSyncthingIcon } from "./icons";
import { getStatusDisplay } from "./status-utils";

export class StatusBarManager {
	private plugin: Plugin;
	private statusBarItem: HTMLElement | null = null;
	private onClickCallback: () => void;

	constructor(plugin: Plugin, onClick: () => void) {
		this.plugin = plugin;
		this.onClickCallback = onClick;
	}

	init() {
		this.statusBarItem = this.plugin.addStatusBarItem();
		this.statusBarItem.addClass("mod-clickable");
		this.statusBarItem.setAttribute("data-tooltip-position", "top");
		this.statusBarItem.addEventListener("click", this.onClickCallback);

		this.plugin.registerEvent(
			this.plugin.app.workspace.on("syncthing:status-changed", () => {
				this.update();
			}),
		);
	}

	update() {
		if (!this.statusBarItem) return;

		// Tipagem segura para ler propriedades injetadas dinamicamente via plugin principal (SyncthingController)
		const pluginSafe = this.plugin as any;

		const status: SyncStatus = pluginSafe.currentStatus || "desconhecido";
		const lastSyncTime: string = pluginSafe.lastSyncTime || "--:--";
		const connectedDevices: number = pluginSafe.connectedDevices || 0;

		const { text, cssClass } = getStatusDisplay(status);

		const tooltipInfo = `${text}\n\n${t("info_last_sync")}: ${lastSyncTime}\n${t("info_devices")}: ${connectedDevices}`;

		this.statusBarItem.empty();
		const iconSpan = this.statusBarItem.createSpan({
			cls: "status-bar-item-icon",
		});
		const svg = createSyncthingIcon(cssClass);
		iconSpan.appendChild(svg);
		this.statusBarItem.setAttribute("aria-label", tooltipInfo);
	}

	destroy() {
		if (this.statusBarItem) {
			this.statusBarItem.detach();
			this.statusBarItem = null;
		}
	}
}
