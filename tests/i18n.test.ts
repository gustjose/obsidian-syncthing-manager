import { describe, it, expect } from "vitest";
import en from "../src/lang/locales/en.json";
import ptBR from "../src/lang/locales/pt-BR.json";
import ruRU from "../src/lang/locales/ru-RU.json";
import zhCN from "../src/lang/locales/zh-CN.json";

describe("Translations", () => {
	it("todos os idiomas devem ter as mesmas chaves que o inglês", () => {
		const baseKeys = Object.keys(en);
		const locales = [
			{ name: "PT-BR", data: ptBR },
			{ name: "RU-RU", data: ruRU },
			{ name: "ZH-CN", data: zhCN },
		];

		locales.forEach((locale) => {
			const localeKeys = Object.keys(locale.data);
			const missingKeys = baseKeys.filter(
				(key) => !localeKeys.includes(key),
			);

			expect(
				missingKeys,
				`Faltam chaves no idioma ${locale.name}`,
			).toEqual([]);
		});
	});
});
