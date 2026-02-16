import { App, Modal, ButtonComponent } from "obsidian";
import { t } from "../lang/lang";

export class ConfirmModal extends Modal {
	title: string;
	message: string;
	onConfirm: () => void | Promise<void>;

	constructor(
		app: App,
		title: string,
		message: string,
		onConfirm: () => void | Promise<void>,
	) {
		super(app);
		this.title = title;
		this.message = message;
		this.onConfirm = onConfirm;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl("h2", { text: this.title });
		contentEl.createEl("p", { text: this.message });

		const buttonContainer = contentEl.createDiv({
			cls: "modal-button-container",
		});

		new ButtonComponent(buttonContainer)
			.setButtonText(t("btn_cancel") || "Cancel")
			.onClick(() => {
				this.close();
			});

		new ButtonComponent(buttonContainer)
			.setButtonText(t("btn_restore") || "Confirm")
			.setCta()
			.onClick(async () => {
				await this.onConfirm();
				this.close();
			});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
