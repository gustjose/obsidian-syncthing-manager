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
export function getStatusDisplay(status: SyncStatus): StatusDisplay {
	switch (status) {
		case "conectado":
			return {
				text: t("status_synced"),
				cssClass: "st-color-success",
				icon: "check-circle",
			};
		case "sincronizando":
			return {
				text: t("status_syncing"),
				cssClass: "st-color-warning",
				icon: "loader",
			};
		case "desconectado":
			return {
				text: t("status_offline"),
				cssClass: "st-color-muted",
				icon: "wifi-off",
			};
		case "erro":
			return {
				text: t("status_error"),
				cssClass: "st-color-error",
				icon: "alert-triangle",
			};
		case "pausado":
			return {
				text: t("status_paused"),
				cssClass: "st-color-muted",
				icon: "pause-circle",
			};
		case "configurando":
			return {
				text: t("status_config"),
				cssClass: "st-color-muted",
				icon: "settings",
			};
		default:
			return {
				text: t("status_unknown"),
				cssClass: "st-color-muted",
				icon: "help-circle",
			};
	}
}
