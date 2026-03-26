import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = path.join(__dirname, "../src/lang/locales");

/**
 * Script para adicionar uma nova chave de tradução em todos os arquivos JSON de localidade.
 * 
 * Uso: node scripts/add-translation.mjs <chave> <valor> [--exclude lista,de,arquivos]
 * Exemplo: node scripts/add-translation.mjs status_new "Novo Status" --exclude en.json,pt.json
 */
async function addTranslation() {
	const args = process.argv.slice(2);
	
	if (args.length < 2) {
		console.error("Erro: Você deve fornecer a chave e o valor padrão.");
		console.log("Uso: node scripts/add-translation.mjs <chave> <valor> [--exclude lista,de,arquivos]");
		process.exit(1);
	}

	const key = args[0];
	const value = args[1];
	
	// Processa exclusões
	let excludedFiles = ["en.json", "pt.json"]; // Padrão
	const excludeIdx = args.indexOf("--exclude");
	if (excludeIdx !== -1 && args[excludeIdx + 1]) {
		excludedFiles = args[excludeIdx + 1].split(",");
	}

	try {
		const files = await fs.readdir(LOCALES_DIR);
		const jsonFiles = files.filter(f => f.endsWith(".json"));

		console.log(`🚀 Adicionando chave "${key}" em ${jsonFiles.length - excludedFiles.length} arquivos...`);

		for (const file of jsonFiles) {
			if (excludedFiles.includes(file)) {
				console.log(`- Ignorando: ${file} (manual)`);
				continue;
			}

			const filePath = path.join(LOCALES_DIR, file);
			const content = await fs.readFile(filePath, "utf-8");
			
			try {
				const json = JSON.parse(content);
				
				if (json[key]) {
					console.log(`- Aviso: Chave "${key}" já existe em ${file}. Pulando.`);
					continue;
				}

				// Adiciona a nova chave
				json[key] = value;

				// Salva mantendo a indentação de tabs (padrão do projeto)
				await fs.writeFile(filePath, JSON.stringify(json, null, "\t") + "\n", "utf-8");
				console.log(`✅ Atualizado: ${file}`);
			} catch (e) {
				console.error(`❌ Erro ao processar ${file}:`, e.message);
			}
		}

		console.log("\n✨ Processo concluído com sucesso!");
	} catch (error) {
		console.error("❌ Erro fatal:", error.message);
		process.exit(1);
	}
}

addTranslation();
