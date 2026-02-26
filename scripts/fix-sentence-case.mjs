import fs from "fs";
import path from "path";
import { evaluateSentenceCase } from "eslint-plugin-obsidianmd/dist/lib/rules/ui/sentenceCaseUtil.js";

const enPath = path.resolve("./src/lang/locales/en.json");
const enData = JSON.parse(fs.readFileSync(enPath, "utf8"));

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
	acronyms: ["OK", "API", "URL", "HTTPS", "HTTP", "TLS", "IP", "ID", "GUI"],
	enforceCamelCaseLower: true,
};

let modified = false;

for (const [key, value] of Object.entries(enData)) {
	if (typeof value === "string") {
		const result = evaluateSentenceCase(value, options);
		if (!result.ok && result.suggestion) {
			enData[key] = result.suggestion;
			modified = true;
			console.log(`Fixing ${key}: "${value}" -> "${result.suggestion}"`);
		}
	}
}

if (modified) {
	fs.writeFileSync(enPath, JSON.stringify(enData, null, "\t") + "\n");
	console.log("Updated en.json with sentence case fixes.");
} else {
	console.log("No issues found to fix.");
}
