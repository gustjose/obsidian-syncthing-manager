import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const VAULT_PLUGINS_PATH = 'C:/Users/Gustavo/Android/dev-obsidian/.obsidian/plugins';

console.log('🚀 Iniciando processo de Build e Instalação...');

const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf-8'));
const pluginId = manifest.id;
const targetDir = path.join(VAULT_PLUGINS_PATH, pluginId);

console.log(`📦 Plugin ID detectado: ${pluginId}`);
console.log(`📂 Destino: ${targetDir}`);

try {
    console.log('🔨 Compilando (npm run build)...');
    execSync('npm run build', { stdio: 'inherit' });
} catch {
    console.error('❌ Erro na compilação. Processo abortado.');
    process.exit(1);
}

if (!fs.existsSync(targetDir)) {
    console.log('📁 Criando pasta do plugin no cofre...');
    fs.mkdirSync(targetDir, { recursive: true });
}

const filesToCopy = ['main.js', 'manifest.json', 'styles.css'];

filesToCopy.forEach(file => {
    const source = path.resolve(file);
    const destination = path.join(targetDir, file);

    if (fs.existsSync(source)) {
        fs.copyFileSync(source, destination);
        console.log(`✅ Copiado: ${file}`);
    } else {
        console.warn(`⚠️ Aviso: Arquivo ${file} não encontrado na raiz.`);
    }
});

console.log('🎉 Sucesso! Plugin atualizado no cofre de testes.');
console.log('👉 Lembre-se de recarregar o plugin no Obsidian ou usar o Hot Reload.');