import { App, Modal, Setting, setIcon } from "obsidian";
import { t } from "../lang/lang";

/**
 * Modal para exibir a lista de dispositivos onde um arquivo está disponível.
 */
export class FileAvailabilityModal extends Modal {
	private devices: string[];
	private fileName: string;

	/**
	 * @param app Instância do Obsidian App.
	 * @param fileName Nome do arquivo para exibição no título.
	 * @param devices Lista de nomes de dispositivos.
	 */
	constructor(app: App, fileName: string, devices: string[]) {
		super(app);
		this.fileName = fileName;
		this.devices = devices;
	}

	/**
	 * Renderiza o conteúdo do modal.
	 */
	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl("h2", {
			text: t("notice_file_status_title"),
		});

		contentEl.createEl("p", {
			text: `${this.fileName}`,
			cls: "st-availability-filename",
		});

		if (this.devices.length === 0) {
			contentEl.createEl("p", {
				text: t("notice_file_not_synced"),
			});
			return;
		}

		const listContainer = contentEl.createDiv("st-availability-list");

		this.devices.forEach((deviceName) => {
			const itemSetting = new Setting(listContainer).setName(deviceName);
			const iconEl = itemSetting.nameEl.createSpan({
				cls: "st-availability-icon",
			});
			setIcon(iconEl, "laptop");
		});

		new Setting(contentEl).addButton((btn) => {
			btn.setButtonText(t("btn_cancel") || "Fechar").onClick(() =>
				this.close(),
			);
		});
	}

	/**
	 * Limpa o conteúdo ao fechar.
	 */
	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}
}
