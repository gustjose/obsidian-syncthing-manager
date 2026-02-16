import { App, Modal, Notice, Setting } from "obsidian";
import SyncthingController from "../main";
import { SyncthingAPI, SyncthingVersion } from "../api/syncthing-api";
import { t } from "../lang/lang";
import { Logger, LOG_MODULES } from "../utils/logger";
import { ConfirmModal } from "./confirm-modal";

export class VersionModal extends Modal {
	plugin: SyncthingController;
	filePath: string;
	versions: SyncthingVersion[] = [];

	constructor(app: App, plugin: SyncthingController, filePath: string) {
		super(app);
		this.plugin = plugin;
		this.filePath = filePath;
	}

	async onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl("h2", {
			text: t("modal_versions_title") || "File Versions",
		});

		const loadingEl = contentEl.createDiv({ text: "Loading versions..." });

		try {
			// Ensure we have the folder ID and API key
			if (
				!this.plugin.settings.syncthingApiKey ||
				!this.plugin.settings.syncthingFolderId
			) {
				loadingEl.setText(
					t("notice_config_first") ||
						"Please configure Syncthing API first.",
				);
				return;
			}

			// The path needs to be relative to the Syncthing folder root.
			// If the vault is a subdirectory of the sync folder, we need to PREPEND the prefix.
			// Example: Vault = Sync/Obsidian, File = Note.md -> Relative = Obsidian/Note.md
			let relativePath = this.filePath;
			if (this.plugin.pathPrefix) {
				relativePath = this.plugin.pathPrefix + this.filePath;
			}

			this.versions = await SyncthingAPI.getVersions(
				this.plugin.apiUrl,
				this.plugin.settings.syncthingApiKey,
				this.plugin.settings.syncthingFolderId,
				relativePath,
			);

			loadingEl.remove();

			if (this.versions.length === 0) {
				contentEl.createDiv({
					text:
						t("modal_versions_empty") ||
						"No previous versions found.",
				});
				return;
			}

			// Sort by date descending
			this.versions.sort(
				(a, b) =>
					new Date(b.modTime).getTime() -
					new Date(a.modTime).getTime(),
			);

			const container = contentEl.createDiv();

			this.versions.forEach((version) => {
				const dateParams = new Date(version.modTime);
				const dateStr = dateParams.toLocaleString();
				const sizeStr = this.formatBytes(version.size);

				new Setting(container)
					.setName(`${dateStr}`)
					.setDesc(`${sizeStr}`)
					.addButton((btn) =>
						btn
							.setButtonText(t("btn_restore") || "Restore")
							.onClick(async () => {
								this.restoreVersion(version, relativePath);
							}),
					);
			});
		} catch (error) {
			loadingEl.setText("Error loading versions. Check console.");
			Logger.error(LOG_MODULES.MAIN, "Failed to load versions", error);
		}
	}

	restoreVersion(version: SyncthingVersion, relativePath: string) {
		const dateStr = new Date(version.modTime).toLocaleString();
		// Replace {date} in the translation string
		const message = (
			t("confirm_restore") || "Are you sure? {date}"
		).replace("{date}", dateStr);

		new ConfirmModal(
			this.app,
			t("modal_confirm_title") || "Confirm Restore",
			message,
			async () => {
				await this.performRestore(version, relativePath);
			},
		).open();
	}

	async performRestore(version: SyncthingVersion, relativePath: string) {
		try {
			await SyncthingAPI.restoreVersion(
				this.plugin.apiUrl,
				this.plugin.settings.syncthingApiKey,
				this.plugin.settings.syncthingFolderId,
				relativePath,
				version.versionTime, // Use the archival timestamp, not modification time!
			);
			new Notice(
				t("notice_version_restored") ||
					"Version restored successfully.",
			);
			this.close();
			// Trigger a scan to update Obsidian immediately if possible, or wait for Syncthing to sync
			await this.plugin.syncSpecificFile(this.filePath);
		} catch (error) {
			new Notice(
				t("notice_restore_fail") || "Failed to restore version.",
			);
			Logger.error(LOG_MODULES.MAIN, "Failed to restore version", error);
		}
	}

	formatBytes(bytes: number, decimals = 2) {
		if (bytes === 0) return "0 Bytes";
		const k = 1024;
		const dm = decimals < 0 ? 0 : decimals;
		const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return (
			parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i]
		);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
