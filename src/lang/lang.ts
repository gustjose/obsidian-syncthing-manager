import { moment } from "obsidian";
import en from "./locales/en.json";
import pt from "./locales/pt.json";
import ru from "./locales/ru.json";
import zh from "./locales/zh.json";
import tr from "./locales/tr.json";

const locales: Record<string, Record<string, string>> = {
	pt,
	ru,
	zh,
	tr,
};

export const LANGUAGE_LIST = [
	{ code: "auto", display: "Auto" },
	{ code: "en", display: "English" },
	{ code: "pt", display: "Português" },
	{ code: "ru", display: "Русский" },
	{ code: "zh", display: "简体中文" },
	{ code: "tr", display: "Türkçe" },
];

export type TranslationKey = keyof typeof en;
let userLanguage = "auto";

export function setLanguage(lang: string) {
	userLanguage = lang;
}

export function t(key: TranslationKey): string {
	let lang = userLanguage;

	if (lang === "auto") {
		lang = moment.locale();
	}

	if (lang && lang.length >= 2) {
		lang = lang.substring(0, 2).toLowerCase();
	}

	const dict = locales[lang];
	const defaultDict: Record<string, string> = en;

	const translation =
		dict && dict[key as string]
			? dict[key as string]
			: defaultDict[key as string];

	return translation || key;
}
