import tsparser from "@typescript-eslint/parser";
import { defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";
import globals from "globals";

export default defineConfig([
	{
		ignores: [
			"eslint.config.js",
			"node_modules/",
			"dist/",
			"docs/",
			"site/",
			"main.js",
			"package.json",
			"package-lock.json",
		],
	},
	// 2. Configuração para os SCRIPTS (Node.js)
	{
		files: ["scripts/**/*.mjs", "scripts/**/*.js"],
		languageOptions: {
			globals: {
				...globals.node,
			},
		},
	},
	// 3. Configuração do PLUGIN (Obsidian/Browser)
	...obsidianmd.configs.recommendedWithLocalesEn,
	{
		files: ["src/**/*.ts", "src/**/*.tsx"],
		languageOptions: {
			parser: tsparser,
			parserOptions: { project: "./tsconfig.json" },
			globals: {
				...globals.browser,
				...globals.es2021,
			},
		},

		rules: {
			"obsidianmd/sample-names": "off",
			"obsidianmd/ui/sentence-case": [
				"warn",
				{
					brands: ["Syncthing", "Obsidian", "GitHub", "Android"],
					acronyms: ["OK", "API", "URL", "HTTPS", "TLS", "IP", "ID"],
					enforceCamelCaseLower: true,
					allowAutoFix: true,
				},
			],
		},
	},
]);
