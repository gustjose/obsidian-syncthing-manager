import { readFileSync, writeFileSync, existsSync } from "fs";

// Pega argumentos ou variável de ambiente
const args = process.argv.slice(2);
let targetVersion = args[0] || process.env.npm_package_version;

if (!targetVersion) {
    console.error("❌ Erro: Nenhuma versão especificada.");
    process.exit(1);
}

console.log(`📦 Processando versão: ${targetVersion}`);

// --- BLOCO 1: ATUALIZAR MANIFEST.JSON ---
const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const { minAppVersion } = manifest;
manifest.version = targetVersion;
writeFileSync("manifest.json", JSON.stringify(manifest, null, "\t"));
console.log("✅ manifest.json atualizado");

// --- BLOCO 2: ATUALIZAR VERSIONS.JSON (Lógica Inteligente) ---
const versions = JSON.parse(readFileSync("versions.json", "utf8"));

// Só adiciona se a "minAppVersion" ainda não existir nos valores
if (!Object.values(versions).includes(minAppVersion)) {
    versions[targetVersion] = minAppVersion;
    writeFileSync("versions.json", JSON.stringify(versions, null, "\t"));
    console.log(`✅ versions.json atualizado (Novo requisito: ${minAppVersion})`);
} else {
    console.log(`ℹ️ versions.json mantido (Requisito ${minAppVersion} já existe)`);
}

// --- BLOCO 3: ATUALIZAR PACKAGE.JSON ---
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
if (pkg.version !== targetVersion) {
    pkg.version = targetVersion;
    writeFileSync("package.json", JSON.stringify(pkg, null, "\t") + "\n");
    console.log("✅ package.json atualizado");
}

// --- BLOCO 4: ATUALIZAR PACKAGE-LOCK.JSON ---
if (existsSync("package-lock.json")) {
    const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
    let mudouLock = false;

    if (lock.version !== targetVersion) {
        lock.version = targetVersion;
        mudouLock = true;
    }
    if (lock.packages && lock.packages[""] && lock.packages[""].version !== targetVersion) {
        lock.packages[""].version = targetVersion;
        mudouLock = true;
    }

    if (mudouLock) {
        writeFileSync("package-lock.json", JSON.stringify(lock, null, "\t") + "\n");
        console.log("✅ package-lock.json atualizado");
    }
}