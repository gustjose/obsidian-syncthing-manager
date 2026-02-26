import { build } from "esbuild";
import fs from "fs/promises";
import url from "url";
import path from "path";

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

async function run() {
	const localesDir = path.join(__dirname, "../src/lang/locales");
	const files = ["en", "pt", "ru"];

	for (const file of files) {
		const tsPath = path.join(localesDir, `${file}.ts`);
		const jsPath = path.join(localesDir, `${file}.mjs`);
		const jsonPath = path.join(localesDir, `${file}.json`);

		try {
			await build({
				entryPoints: [tsPath],
				outfile: jsPath,
				format: "esm",
			});

			const module = await import(url.pathToFileURL(jsPath).href);
			const data = module.default;

			await fs.writeFile(
				jsonPath,
				JSON.stringify(data, null, "\t") + "\n",
			);
			console.log(`Converted ${file}.ts to ${file}.json`);

			await fs.rm(tsPath);
			await fs.rm(jsPath);
		} catch (e) {
			console.error(`Error converting ${file}:`, e);
		}
	}
}
run();
