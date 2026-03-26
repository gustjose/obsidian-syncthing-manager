import { SyncStatus } from "../types";
import { t } from "../lang/lang";

export interface StatusDisplay {
	text: string;
	cssClass: string;
	icon: string;
}

/**
 * Retorna o texto, classe CSS e ícone correspondentes ao status de sincronização.
 */
export function getStatusDisplay(
	status: SyncStatus,
	deviceName?: string | null,
): StatusDisplay {
	let display: StatusDisplay;

	switch (status) {
		case "conectado":
			display = {
				text: t("status_synced"),
				cssClass: "st-color-success",
				icon: "check-circle",
			};
			break;
		case "sincronizando":
			display = {
				text: t("status_syncing"),
				cssClass: "st-color-warning",
				icon: "loader",
			};
			break;
		case "desconectado":
			display = {
				text: t("status_offline"),
				cssClass: "st-color-muted",
				icon: "wifi-off",
			};
			break;
		case "aguardando-dispositivos":
			display = {
				text: t("status_waiting_devices"),
				cssClass: "st-color-muted",
				icon: "monitor",
			};
			break;
		case "erro":
			display = {
				text: t("status_error"),
				cssClass: "st-color-error",
				icon: "alert-triangle",
			};
			break;
		case "pausado":
			display = {
				text: t("status_paused"),
				cssClass: "st-color-muted",
				icon: "pause-circle",
			};
			break;
		case "pausado-remoto":
			display = {
				text: t("status_paused_remote"),
				cssClass: "st-color-muted",
				icon: "pause-circle",
			};
			break;
		case "configurando":
			display = {
				text: t("status_config"),
				cssClass: "st-color-muted",
				icon: "settings",
			};
			break;
		default:
			display = {
				text: t("status_unknown"),
				cssClass: "st-color-muted",
				icon: "help-circle",
			};
			break;
	}

	// Processa substituição de variáveis se houver nome de dispositivo
	if (deviceName && display.text.includes("{device}")) {
		display.text = display.text.replace("{device}", deviceName);
	}

	return display;
}
