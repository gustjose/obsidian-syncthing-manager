import { App, TFile, Notice } from "obsidian";
import { t } from "../lang/lang";
import { Logger, LOG_MODULES } from "../utils/logger";

export interface ConflictFile {
	file: TFile;
	baseName: string;
	date: string;
	path: string;
}

export class ConflictManager {
	app: App;

	constructor(app: App) {
		this.app = app;
	}

	getConflicts(): ConflictFile[] {
		const allFiles = this.app.vault.getFiles();
		const conflicts: ConflictFile[] = [];

		const regex = /(.+)\.sync-conflict-(\d{8}-\d{6})-(.+)(\.[^.]+)$/;

		allFiles.forEach((file) => {
			if (file.name.includes(".sync-conflict-")) {
				const match = file.name.match(regex);
				conflicts.push({
					file: file,
					baseName: match ? match[1] + match[4] : file.name,
					date: match ? match[2] : "Unknown",
					path: file.path,
				});
			}
		});

		return conflicts;
	}

	async deleteConflict(conflict: ConflictFile) {
		try {
			await this.app.fileManager.trashFile(conflict.file);
			new Notice(`Conflito removido: ${conflict.file.name}`);
		} catch (e) {
			new Notice(t("conflict_delete_error"));
			Logger.error(LOG_MODULES.CONFLICT, "Erro ao deletar arquivo.", e);
		}
	}

	async acceptConflict(conflict: ConflictFile) {
		const originalPath = conflict.path.replace(
			conflict.file.name,
			conflict.baseName,
		);
		const originalFile = this.app.vault.getAbstractFileByPath(originalPath);

		try {
			if (originalFile && originalFile instanceof TFile) {
				await this.app.fileManager.trashFile(originalFile);
			}

			await this.app.vault.rename(conflict.file, originalPath);
			new Notice(`Versão de conflito restaurada: ${conflict.baseName}`);
		} catch (e) {
			new Notice(t("conflict_restore_error"));
			Logger.error(
				LOG_MODULES.CONFLICT,
				"Erro ao restaurar conflito.",
				e,
			);
		}
	}
}
