import fs from "fs";
import path from "path";

// --- CONFIGURAÇÃO ---
const VAULT_PATH = "C:/Users/Gustavo/Android/dev-obsidian";

const BASE_FILENAME = "TesteConflito.md";

function generateTimestamp() {
	const now = new Date();
	// Formata para YYYYMMDD-HHMMSS (Padrão do Syncthing)
	const date = now.toISOString().slice(0, 10).replace(/-/g, "");
	const time = now.toTimeString().slice(0, 8).replace(/:/g, "");
	return `${date}-${time}`;
}

function createConflict() {
	if (!fs.existsSync(VAULT_PATH)) {
		console.error(`❌ Erro: O caminho do cofre não existe: ${VAULT_PATH}`);
		process.exit(1);
	}

	// 1. Cria o arquivo Original (se não existir ou sobrescreve)
	const originalPath = path.join(VAULT_PATH, BASE_FILENAME);
	const originalContent = `# Planejamento de Reunião Diária

## Tópicos do Dia (Versão Computador)
1. Discutir as metas da Sprint 42.
2. Analisar os bugs críticos relatados pelos clientes no final de semana.
3. Revisar a arquitetura do novo módulo de autenticação.

## Observações Gerais
Hoje o dia está bastante chuvoso. Recomendo que a equipe faça home office se possível. Não esqueçam de bater o ponto no sistema novo.

---
*Gerado via Syncthing Manager Tests*`;

	fs.writeFileSync(originalPath, originalContent);
	console.log(`✅ Arquivo original criado: ${BASE_FILENAME}`);

	// 2. Cria o arquivo de Conflito
	const timestamp = generateTimestamp();
	const conflictName = `TesteConflito.sync-conflict-${timestamp}-ScriptDev.md`;
	const conflictPath = path.join(VAULT_PATH, conflictName);

	const conflictContent = `# Planejamento de Reunião Diária

## Tópicos do Dia (Versão Celular)
1. Discutir as metas da Sprint 42.
2. URGE: Adicionar pauta sobre a queda do servidor de banco de dados hoje cedo!
3. Revisar a arquitetura do novo módulo de autenticação.
4. Alinhar folgas do mês que vem.

## Observações Gerais
O Sol está raiando lá fora! Lembrem-se de passar protetor solar se vierem de bicicleta. Não esqueçam de bater o ponto no sistema novo (Aquele lá, o portal azul).

---
*Gerado via Celular (Conflito)*`;

	fs.writeFileSync(conflictPath, conflictContent);
	console.log(`⚠️ Arquivo de conflito criado: ${conflictName}`);

	console.log(
		"\n👉 Agora abra o Obsidian e verifique o painel lateral do plugin!",
	);
}

createConflict();
