import { ItemView, WorkspaceLeaf, setIcon } from "obsidian";
import SyncthingController from "../main";
import { t } from "../lang/lang";
import { ConflictManager } from "../services/conflict-manager";
import { ConflictModal } from "../ui/conflict-modal";
import { SyncthingHistoryItem } from "../api/syncthing-api";
import { getStatusDisplay } from "./status-utils";
import { Logger, LOG_MODULES } from "../utils/logger";

export const VIEW_TYPE_SYNCTHING = "syncthing-view";

export class SyncthingView extends ItemView {
	plugin: SyncthingController;
	conflictManager: ConflictManager;

	constructor(leaf: WorkspaceLeaf, plugin: SyncthingController) {
		super(leaf);
		this.plugin = plugin;
		this.conflictManager = new ConflictManager(plugin.app);
	}

	getViewType() {
		return VIEW_TYPE_SYNCTHING;
	}
	getDisplayText() {
		return "Syncthing controller";
	}
	getIcon() {
		return "refresh-cw";
	}

	onOpen() {
		this.render();

		// Registra para atualizar quando status mudar
		this.registerEvent(
			this.app.workspace.on("syncthing:status-changed", () => {
				this.updateView();
			}),
		);

		return Promise.resolve();
	}
	async onClose() {}

	render() {
		const container = this.containerEl.children[1];
		container.empty();
		container.addClass("syncthing-view-container");

		// 1. Conflitos
		if (this.plugin.settings.modalConflict) {
			const conflicts = this.conflictManager.getConflicts();
			if (conflicts.length > 0) {
				const alertBox = container.createDiv({
					cls: "st-conflict-alert",
				});

				const iconSpan = alertBox.createSpan();
				setIcon(iconSpan, "alert-octagon");
				alertBox.createSpan({
					text: ` ${conflicts.length} ${t(
						"alert_conflict_detected",
					)}`,
				});

				alertBox.createDiv({
					text: t("alert_click_to_resolve"),
					cls: "st-conflict-subtext",
				});

				alertBox.addEventListener("click", () => {
					new ConflictModal(this.app, this.conflictManager, () => {
						this.render();
					}).open();
				});
			}
		}

		// 2. Status
		const statusBox = container.createDiv({ cls: "st-status-box" });
		const iconDiv = statusBox.createDiv({ cls: "st-big-icon" });

		const {
			text: statusTextBase,
			cssClass,
			icon,
		} = getStatusDisplay(this.plugin.currentStatus);

		let statusText = statusTextBase;
		if (
			this.plugin.currentStatus === "pausado-remoto" &&
			this.plugin.remotePausedDevice
		) {
			statusText = statusTextBase.replace(
				"{device}",
				this.plugin.remotePausedDevice,
			);
		}

		setIcon(iconDiv, icon);

		iconDiv.addClass(cssClass);
		statusBox
			.createDiv({ cls: "st-status-text", text: statusText })
			.addClass(cssClass);

		// Barra de Progresso (permanente na estrutura)
		const progressContainer = container.createDiv({
			cls: "st-progress-bar-container",
		});
		const progressFill = progressContainer.createDiv({
			cls: "st-progress-bar-fill",
		});

		if (this.plugin.currentStatus === "sincronizando") {
			const completion = this.plugin.monitor?.currentCompletion ?? 0;
			progressFill.style.width = `${completion}%`;
			if (completion > 0 && completion < 100) {
				progressContainer.addClass("st-active");
			}
		} else {
			progressFill.style.width = `0%`;
		}

		// 3. Tabela
		const infoContainer = container.createDiv({ cls: "st-info-container" });
		this.createRow(
			infoContainer,
			"clock",
			t("info_last_sync"),
			this.plugin.lastSyncTime,
		);
		// 3.1 Devices Row (Badges)
		this.createRow(
			infoContainer,
			"monitor",
			t("info_devices"),
			"", // Value empty, we will append badges
		);
		// Get the last row's value container to append badges
		const rows = infoContainer.querySelectorAll(".st-info-row");
		const lastRow = rows[rows.length - 1];
		const valueDiv = lastRow.querySelector(".st-info-value");

		if (valueDiv) {
			valueDiv.empty(); // Clear text
			// Ensure flex wrap for multiple badges
			valueDiv.addClass("st-badges-container");

			const deviceNames = this.plugin.connectedDeviceNames;
			if (deviceNames.length === 0) {
				valueDiv.setText("0");
			} else {
				deviceNames.forEach((name) => {
					valueDiv.createSpan({
						cls: "st-device-badge",
						text: name,
					});
				});
			}
		}

		const folderDisplay =
			this.plugin.settings.syncthingFolderLabel || "Default";
		this.createRow(
			infoContainer,
			"folder",
			t("info_folder"),
			folderDisplay,
		);

		// 4. Botão
		const btnContainer = container.createDiv({ cls: "st-btn-container" });
		const btn = btnContainer.createEl("button", {
			cls: "mod-cta st-sync-button", // Adicionei uma classe extra para CSS
		});

		// A: Cria o container do ícone
		const btnIcon = btn.createSpan({ cls: "st-btn-icon-span" });
		setIcon(btnIcon, "refresh-cw"); // Ícone do Obsidian (flechas circulares)

		// B: Cria o container do texto
		const btnText = btn.createSpan({ text: t("btn_sync_now") });

		btn.addEventListener("click", () => {
			btnText.setText(t("btn_requesting") || "Requesting...");
			btn.disabled = true;

			btnIcon.addClass("st-spin-anim");

			this.plugin
				.forcarSincronizacao()
				.catch((err) => console.error(err));
		});

		const isRemotePaused =
			this.plugin.currentStatus === "pausado-remoto";

		const btnPause = btnContainer.createEl("button", {
			cls: "st-pause-button",
			attr: {
				"aria-label": isRemotePaused
					? t("status_paused_remote")
					: this.plugin.isPaused
						? t("tooltip_resume") || "Resume sync"
						: t("tooltip_pause") || "Pause sync",
			},
		});

		if (isRemotePaused) {
			btnPause.disabled = true;
		}

		const pauseIcon = this.plugin.isPaused
			? "play-circle"
			: isRemotePaused
				? "lock"
				: "pause-circle";

		setIcon(btnPause, pauseIcon);

		if (isRemotePaused) {
			btnPause.addClass("st-btn-remote-paused");
		}

		btnPause.addEventListener("click", () => {
			this.plugin
				.togglePause()
				.catch((err) =>
					Logger.error(LOG_MODULES.MAIN, "Erro no togglePause", err),
				);
		});

		// 5. Seção de Histórico
		if (this.plugin.history.length > 0) {
			container.createEl("h4", {
				text: t("info_history"),
				cls: "st-history-title",
			});

			const historyContainer = container.createDiv({
				cls: "st-history-container",
			});

			this.plugin.history.forEach((item: SyncthingHistoryItem) => {
				const itemEl = historyContainer.createDiv({
					cls: "st-history-item",
				});

				const leftSide = itemEl.createDiv({ cls: "st-history-left" });

				const isIncoming = item.direction === "in";
				const arrowIcon = isIncoming
					? "arrow-down-left"
					: "arrow-up-right";
				const arrowClass = isIncoming
					? "st-direction-in"
					: "st-direction-out";

				const arrowSpan = leftSide.createSpan({
					cls: `st-history-arrow ${arrowClass}`,
				});
				arrowSpan.setAttribute(
					"aria-label",
					isIncoming
						? t("history_incoming") || "Recebido (Remoto)"
						: t("history_outgoing") || "Enviado (Local)",
				);
				setIcon(arrowSpan, arrowIcon);
				// ------------------------------------------

				// Ícone do Tipo de Arquivo (Lógica original mantida/ajustada)
				const iconInfo: { icon: string; class: string } =
					item.action === "deleted"
						? { icon: "trash", class: "st-color-error" }
						: item.action === "added"
							? { icon: "plus-circle", class: "st-color-success" }
							: { icon: "file-text", class: "st-color-muted" };

				const iconSpan = leftSide.createSpan({
					cls: `st-history-icon ${iconInfo.class}`,
				});
				setIcon(iconSpan, iconInfo.icon);

				const details = leftSide.createDiv({
					cls: "st-history-details",
				});
				details.createDiv({
					text: item.filename,
					cls: "st-history-filename",
				});
				details.createDiv({
					text: item.timestamp,
					cls: "st-history-time",
				});
			});
		}
	}

	createRow(
		container: HTMLElement,
		icon: string,
		label: string,
		value: string,
	) {
		const row = container.createDiv({ cls: "st-info-row" });
		const left = row.createDiv({ cls: "st-info-left" });
		setIcon(left.createSpan({ cls: "st-info-icon" }), icon);
		left.createSpan({ text: label });

		row.createDiv({ cls: "st-info-value", text: value });
	}

	updateView() {
		this.render();
	}
}
