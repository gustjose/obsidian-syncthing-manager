import { describe, it, expect } from "vitest";
import en from "../src/lang/locales/en.json";
import pt from "../src/lang/locales/pt.json";
import ru from "../src/lang/locales/ru.json";

describe("Translations", () => {
	it("todos os idiomas devem ter as mesmas chaves que o inglês", () => {
		const baseKeys = Object.keys(en);
		const locales = [
			{ name: "PT", data: pt },
			{ name: "RU", data: ru },
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
