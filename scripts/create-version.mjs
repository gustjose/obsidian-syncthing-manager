import fs from "fs";
import path from "path";

// --- CONFIGURAÇÃO ---
// Ajuste para o caminho real do seu cofre de testes
const VAULT_PATH = "C:/Users/Gustavo/Android/dev-obsidian";
const FILENAME = "NotaComVersoes.md";

function generateTimestamp() {
	const now = new Date();
	// Formato Syncthing: YYYYMMDD-HHMMSS
	const date = now.toISOString().slice(0, 10).replace(/-/g, "");
	const time = now.toTimeString().slice(0, 8).replace(/:/g, "");
	return `${date}-${time}`;
}

function createVersion() {
	if (!fs.existsSync(VAULT_PATH)) {
		console.error(`❌ Erro: O caminho do cofre não existe: ${VAULT_PATH}`);
		process.exit(1);
	}

	const versionsDir = path.join(VAULT_PATH, ".stversions");

	// 1. Garante que a pasta .stversions existe
	if (!fs.existsSync(versionsDir)) {
		fs.mkdirSync(versionsDir);
		console.log(`📂 Pasta .stversions criada.`);
	}

	// 2. Cria o arquivo ATUAL no cofre
	const currentPath = path.join(VAULT_PATH, FILENAME);
	const currentContent = `# Versão Atual\n\nEsta é a versão que está visível no Obsidian agora.\n\nEditada em: ${new Date().toLocaleTimeString()}`;
	fs.writeFileSync(currentPath, currentContent);
	console.log(`✅ Arquivo atual criado: ${FILENAME}`);

	// 3. Cria uma VERSÃO ANTIGA na pasta .stversions
	// CORREÇÃO: Separa nome e extensão para formatar corretamente (Nome~Data.Ext)
	const ext = path.extname(FILENAME); // .md
	const name = path.basename(FILENAME, ext); // NotaComVersoes
	const timestamp = generateTimestamp();

	// Formato correto: Nome~Data.Extensão
	const versionFilename = `${name}~${timestamp}${ext}`;
	const versionPath = path.join(versionsDir, versionFilename);

	const oldContent = `# Versão Antiga (Backup)\n\nEsta é uma versão arquivada pelo Syncthing.\n\nConteúdo antigo e precioso que foi "sobrescrito".`;

	fs.writeFileSync(versionPath, oldContent);
	console.log(
		`📦 Versão arquivada criada em: .stversions/${versionFilename}`,
	);

	console.log(
		"\n👉 Agora limpe a versão errada anterior da pasta .stversions e teste novamente!",
	);
}

createVersion();
