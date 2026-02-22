import { readFileSync, writeFileSync, existsSync } from "fs";
import { execSync } from "child_process";
import readline from "readline";

const pkgPath = "package.json";
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
const currentVersion = pkg.version;

console.log(`\n📦 Versão atual: ${currentVersion}`);

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
});

rl.question("👉 Digite a nova versão: ", (targetVersion) => {
	rl.close();

	if (!targetVersion) {
		console.error("❌ Erro: Nenhuma versão especificada.");
		process.exit(1);
	}

	// --- GATE 1: LINT ---
	console.clear();
	console.log("🔍 Executando lint...\n");
	try {
		execSync("npm run lint", { stdio: "inherit" });
		console.log("\n✅ Lint passou!\n");
	} catch {
		console.error(
			"\n❌ Lint falhou. Corrija os erros antes de fazer o release.",
		);
		process.exit(1);
	}

	// --- GATE 2: TESTES ---
	console.clear();
	console.log("🧪 Executando testes...\n");
	try {
		execSync("npm test", { stdio: "inherit" });
		console.log("\n✅ Testes passaram!\n");
	} catch {
		console.error(
			"\n❌ Testes falharam. Corrija os erros antes de fazer o release.",
		);
		process.exit(1);
	}

	console.clear();
	console.log(`\n⚙️ Aplicando versão: ${targetVersion}...\n`);

	// --- BLOCO 1: ATUALIZAR MANIFEST.JSON ---
	if (existsSync("manifest.json")) {
		const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
		const { minAppVersion } = manifest;
		manifest.version = targetVersion;
		writeFileSync("manifest.json", JSON.stringify(manifest, null, "\t"));
		console.log("✅ manifest.json atualizado");

		// --- BLOCO 2: ATUALIZAR VERSIONS.JSON (Lógica Inteligente) ---
		if (existsSync("versions.json")) {
			const versions = JSON.parse(readFileSync("versions.json", "utf8"));

			// Só adiciona se a "minAppVersion" ainda não existir nos valores
			if (!Object.values(versions).includes(minAppVersion)) {
				versions[targetVersion] = minAppVersion;
				writeFileSync(
					"versions.json",
					JSON.stringify(versions, null, "\t"),
				);
				console.log(
					`✅ versions.json atualizado (Novo requisito: ${minAppVersion})`,
				);
			} else {
				console.log(
					`ℹ️ versions.json mantido (Requisito ${minAppVersion} já existe)`,
				);
			}
		}
	}

	// --- BLOCO 3: ATUALIZAR PACKAGE.JSON ---
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
		if (
			lock.packages &&
			lock.packages[""] &&
			lock.packages[""].version !== targetVersion
		) {
			lock.packages[""].version = targetVersion;
			mudouLock = true;
		}

		if (mudouLock) {
			writeFileSync(
				"package-lock.json",
				JSON.stringify(lock, null, "\t") + "\n",
			);
			console.log("✅ package-lock.json atualizado");
		}
	}

	console.log("\n✨ Arquivos atualizados com sucesso!");

	// --- BLOCO 5: COMMIT, TAG E PUSH NO GIT ---
	try {
		console.log("\n🚀 Criando commit e tag no Git...");

		// Adiciona apenas os arquivos que o script modificou
		execSync(
			"git add package.json package-lock.json manifest.json versions.json",
			{ stdio: "inherit" },
		);

		// Cria o commit
		execSync(`git commit -m "chore: release ${targetVersion}"`, {
			stdio: "inherit",
		});

		// Cria a tag usando exatamente a string digitada (ex: 1.3.0)
		execSync(`git tag ${targetVersion}`, { stdio: "inherit" });

		// Faz o push do commit e da tag para o repositório remoto
		console.log("\n⬆️ Enviando para o GitHub...");
		execSync("git push origin HEAD", { stdio: "inherit" });
		execSync(`git push origin ${targetVersion}`, { stdio: "inherit" });

		console.log(
			"\n🎉 Release publicado com sucesso! O GitHub Actions já deve estar rodando.",
		);
	} catch (error) {
		console.error(
			`\n❌ Ocorreu um erro ao executar os comandos do Git. Erro: ${error}`,
		);
		console.error(
			"Verifique se há arquivos em conflito ou problemas de conexão.",
		);
	}
});
