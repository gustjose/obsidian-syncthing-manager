import { ItemView, WorkspaceLeaf, setIcon } from "obsidian";
import SyncthingController from "../main";
import { t } from "../lang/lang";
import { ConflictManager } from "../services/conflict-manager";
import { ConflictModal } from "../ui/conflict-modal";
import { SyncthingHistoryItem } from "../api/syncthing-api";

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

		const currentStatus = this.plugin.currentStatus;

		let cssClass = "st-color-muted";
		let statusText = t("status_unknown");

		switch (currentStatus) {
			case "conectado":
				cssClass = "st-color-success";
				statusText = t("status_synced");
				setIcon(iconDiv, "check-circle");
				break;
			case "sincronizando":
				cssClass = "st-color-warning";
				statusText = t("status_syncing");
				setIcon(iconDiv, "loader");
				break;
			case "desconectado":
				cssClass = "st-color-muted";
				statusText = t("status_offline");
				setIcon(iconDiv, "wifi-off");
				break;
			case "erro":
				cssClass = "st-color-error";
				statusText = t("status_error");
				setIcon(iconDiv, "alert-triangle");
				break;
			case "pausado":
				cssClass = "st-color-muted";
				statusText = t("status_paused");
				setIcon(iconDiv, "pause-circle");
				break;
			case "configurando":
				cssClass = "st-color-muted";
				statusText = t("status_config");
				setIcon(iconDiv, "settings");
				break;
		}

		iconDiv.addClass(cssClass);
		statusBox
			.createDiv({ cls: "st-status-text", text: statusText })
			.addClass(cssClass);

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
			// Alteramos apenas o span de texto, preservando o ícone
			btnText.setText(t("btn_requesting") || "Requesting...");
			btn.disabled = true;

			// Opcional: Adiciona uma animação de rotação ao ícone durante o clique
			btnIcon.addClass("st-spin-anim");

			this.plugin
				.forcarSincronizacao()
				.catch((err) => console.error(err));
			// Nota: O botão permanece desabilitado até a view recarregar
			// pelo evento do monitor, o que é o comportamento correto.
		});

		// 4.1 Botão Pause/Resume
		const btnPause = btnContainer.createEl("button", {
			cls: "st-pause-button",
			attr: {
				"aria-label": this.plugin.isPaused
					? t("tooltip_resume") || "Resume sync"
					: t("tooltip_pause") || "Pause sync",
			},
		});
		// Remove mod-cta to differentiate? Or keep it? keeping consistent style.
		// Maybe remove mod-cta and just use st-pause-button for specific styling if needed.
		// Let's use mod-cta for consistency but maybe change color via CSS later if needed.
		// Actually, let's keep it simple.

		const pauseIcon = this.plugin.isPaused ? "play-circle" : "pause-circle";
		setIcon(btnPause, pauseIcon);

		btnPause.addEventListener("click", () => {
			this.plugin.togglePause().catch((err) => console.error(err));
		});

		// 5. Seção de Histórico
		if (this.plugin.history.length > 0) {
			const historyTitleKey = "info_history";
			container.createEl("h4", {
				text: t(historyTitleKey as never) || "Recent Activity",
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

				// --- NOVO: Lógica das Setas de Direção ---
				// Define o ícone e a classe de cor baseada na direção (in/out)
				const isIncoming = item.direction === "in";
				const arrowIcon = isIncoming
					? "arrow-down-left"
					: "arrow-up-right";
				const arrowClass = isIncoming
					? "st-direction-in"
					: "st-direction-out";

				// Cria o elemento da seta
				const arrowSpan = leftSide.createSpan({
					cls: `st-history-arrow ${arrowClass}`,
				});
				// Dica: Adicionamos um tooltip simples para explicar a seta ao passar o mouse
				arrowSpan.setAttribute(
					"aria-label",
					isIncoming ? "Recebido (Remoto)" : "Enviado (Local)",
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
