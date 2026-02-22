import { App, Modal, ButtonComponent, TextComponent } from "obsidian";
import { t } from "../lang/lang";

/**
 * Modal para edição de um valor de texto.
 * Usado como substituto do window.prompt para integração com Obsidian.
 */
export class InputModal extends Modal {
	private title: string;
	private initialValue: string;
	private onSubmit: (value: string) => void | Promise<void>;

	constructor(
		app: App,
		title: string,
		initialValue: string,
		onSubmit: (value: string) => void | Promise<void>,
	) {
		super(app);
		this.title = title;
		this.initialValue = initialValue;
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl("h2", { text: this.title });

		const input = new TextComponent(contentEl);
		input.setValue(this.initialValue);
		input.inputEl.type = "password";
		input.inputEl.addClass("st-input-full-width");
		input.inputEl.setCssStyles({ width: "100%", marginBottom: "1em" });

		const buttonContainer = contentEl.createDiv({
			cls: "modal-button-container",
		});

		new ButtonComponent(buttonContainer)
			.setButtonText(t("btn_cancel"))
			.onClick(() => {
				this.close();
			});

		new ButtonComponent(buttonContainer)
			.setButtonText(t("btn_save"))
			.setCta()
			.onClick(async () => {
				await this.onSubmit(input.getValue());
				this.close();
			});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
