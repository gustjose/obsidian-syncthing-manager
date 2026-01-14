import { moment } from "obsidian";
import en from "./locales/en";
import pt from "./locales/pt";
import ru from "./locales/ru";

const locales: Record<string, Partial<typeof en>> = {
	pt: pt,
	ru: ru,
};

export const LANGUAGE_LIST = [
	{ code: "auto", display: "Auto" },
	{ code: "en", display: "English" },
	{ code: "pt", display: "Português" },
	{ code: "ru", display: "Russian" },
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
	const translation = (dict && dict[key] ? dict[key] : en[key]) as string;

	return translation || key;
}
