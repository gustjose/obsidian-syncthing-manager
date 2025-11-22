import { App, TFile, Notice } from 'obsidian';

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

        allFiles.forEach(file => {
            if (file.name.includes('.sync-conflict-')) {
                const match = file.name.match(regex);
                conflicts.push({
                    file: file,
                    baseName: match ? match[1] + match[4] : file.name,
                    date: match ? match[2] : 'Unknown',
                    path: file.path
                });
            }
        });

        return conflicts;
    }

    async deleteConflict(conflict: ConflictFile) {
        try {
            await this.app.vault.delete(conflict.file);
            new Notice(`Conflito removido: ${conflict.file.name}`);
        } catch (e) {
            new Notice('Erro ao apagar arquivo.');
            console.error(e);
        }
    }

    async acceptConflict(conflict: ConflictFile) {
        const originalPath = conflict.path.replace(conflict.file.name, conflict.baseName);
        const originalFile = this.app.vault.getAbstractFileByPath(originalPath);

        try {
            if (originalFile && originalFile instanceof TFile) {
                await this.app.vault.delete(originalFile);
            }

            await this.app.vault.rename(conflict.file, originalPath);
            new Notice(`Versão de conflito restaurada: ${conflict.baseName}`);
        } catch (e) {
            new Notice('Erro ao restaurar conflito.');
            console.error(e);
        }
    }
}