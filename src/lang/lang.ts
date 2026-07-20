import { moment } from "obsidian";
import en from "./locales/en.json";
import ptBR from "./locales/pt-BR.json";
import ruRU from "./locales/ru-RU.json";
import zhCN from "./locales/zh-CN.json";
import trTR from "./locales/tr-TR.json";

const locales: Record<string, Record<string, string>> = {
	"pt-br": ptBR,
	"ru-ru": ruRU,
	"zh-cn": zhCN,
	"tr-tr": trTR,
};

export const LANGUAGE_LIST = [
	{ code: "auto", display: "Auto" },
	{ code: "en", display: "English" },
	{ code: "pt-br", display: "Português (BR)" },
	{ code: "ru-ru", display: "Русский" },
	{ code: "zh-cn", display: "简体中文" },
	{ code: "tr-tr", display: "Türkçe" },
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

	lang = lang.toLowerCase();

	let dict = locales[lang];

	if (!dict && lang.length >= 2) {
		const shortLang = lang.substring(0, 2);
		const match = Object.keys(locales).find(k => k.startsWith(shortLang));
		if (match) {
			dict = locales[match];
		}
	}
	const defaultDict: Record<string, string> = en;

	const translation =
		dict && dict[key as string]
			? dict[key as string]
			: defaultDict[key as string];

	return translation || key;
}
