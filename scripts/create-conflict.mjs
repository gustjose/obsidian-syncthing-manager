import fs from 'fs';
import path from 'path';

// --- CONFIGURAÇÃO ---
const VAULT_PATH = 'C:/Users/Gustavo/Android/dev-obsidian';

const BASE_FILENAME = 'TesteConflito.md';

function generateTimestamp() {
    const now = new Date();
    // Formata para YYYYMMDD-HHMMSS (Padrão do Syncthing)
    const date = now.toISOString().slice(0, 10).replace(/-/g, '');
    const time = now.toTimeString().slice(0, 8).replace(/:/g, '');
    return `${date}-${time}`;
}

function createConflict() {
    if (!fs.existsSync(VAULT_PATH)) {
        console.error(`❌ Erro: O caminho do cofre não existe: ${VAULT_PATH}`);
        process.exit(1);
    }

    // 1. Cria o arquivo Original (se não existir ou sobrescreve)
    const originalPath = path.join(VAULT_PATH, BASE_FILENAME);
    const originalContent = `# Nota Original\n\nEsta é a versão que estava no disco.\n\n- Item A\n- Item B\n- Item C`;
    
    fs.writeFileSync(originalPath, originalContent);
    console.log(`✅ Arquivo original criado: ${BASE_FILENAME}`);

    // 2. Cria o arquivo de Conflito
    const timestamp = generateTimestamp();
    const conflictName = `TesteConflito.sync-conflict-${timestamp}-ScriptDev.md`;
    const conflictPath = path.join(VAULT_PATH, conflictName);
    
    const conflictContent = `# Nota em Conflito\n\nEsta é a versão que veio de outro dispositivo (Conflito).\n\n- Item A\n- Item B (Modificado)\n- Item D (Novo)`;

    fs.writeFileSync(conflictPath, conflictContent);
    console.log(`⚠️ Arquivo de conflito criado: ${conflictName}`);
    
    console.log('\n👉 Agora abra o Obsidian e verifique o painel lateral do plugin!');
}

createConflict();