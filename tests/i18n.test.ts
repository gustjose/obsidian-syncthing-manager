import { describe, it, expect } from "vitest";
import en from "../src/lang/locales/en.json";
import ptBR from "../src/lang/locales/pt-BR.json";
import ru from "../src/lang/locales/ru.json";
import zhCN from "../src/lang/locales/zh-CN.json";

describe("Translations", () => {
	it("todos os idiomas devem ter as mesmas chaves que o inglês", () => {
		const baseKeys = Object.keys(en);
		const locales = [
			{ name: "PT-BR", data: ptBR },
			{ name: "RU", data: ru },
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
