import { Plugin } from "obsidian";
import { SyncStatus } from "../types";
import { t } from "../lang/lang";
import { createSyncthingIcon } from "./icons";

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
		this.statusBarItem.setAttribute("aria-label", "Syncthing controller");
		this.statusBarItem.addEventListener("click", this.onClickCallback);
	}

	update(status: SyncStatus, lastSyncTime: string, connectedDevices: number) {
		if (!this.statusBarItem) return;

		let text = t("status_unknown");
		let cssClass = "st-color-muted";

		switch (status) {
			case "conectado":
				text = t("status_synced");
				cssClass = "st-color-success";
				break;
			case "sincronizando":
				text = t("status_syncing");
				cssClass = "st-color-warning";
				break;
			case "desconectado":
				text = t("status_offline");
				cssClass = "st-color-muted";
				break;
			case "erro":
				text = t("status_error");
				cssClass = "st-color-error";
				break;
			case "configurando":
				text = t("status_config");
				cssClass = "st-color-muted";
				break;
			case "pausado":
				text = t("status_paused");
				cssClass = "st-color-muted";
				break;
		}

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
