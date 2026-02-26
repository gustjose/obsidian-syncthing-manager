import { describe, it, expect } from "vitest";
import en from "../src/lang/locales/en.json";
// Importa o utilitário do ESLint do Obsidian para verificar Sentence Case
import { evaluateSentenceCase } from "eslint-plugin-obsidianmd/dist/lib/rules/ui/sentenceCaseUtil.js";

describe("Sentence Case Validation", () => {
	it("en.json deve seguir o padrão Sentence case do Obsidian", () => {
		const errors: string[] = [];
		const options = {
			brands: [
				"Syncthing",
				"Obsidian",
				"GitHub",
				"Android",
				"Mac",
				"Windows",
				"macOS",
				"Crowdin",
			],
			acronyms: [
				"OK",
				"API",
				"URL",
				"HTTPS",
				"HTTP",
				"TLS",
				"IP",
				"ID",
				"GUI",
			],
			enforceCamelCaseLower: true,
		};

		for (const [key, value] of Object.entries(
			en as Record<string, string>,
		)) {
			if (typeof value === "string") {
				const result = evaluateSentenceCase(value, options);
				if (!result.ok) {
					errors.push(
						`Chave '${key}': esperado "${result.suggestion}", mas recebeu "${value}"`,
					);
				}
			}
		}

		if (errors.length > 0) {
			console.error(
				"Erros de Sentence Case encontrados:\n",
				errors.join("\n"),
			);
		}
		expect(errors.length).toBe(0);
	});
});
