import { defineConfig } from "vitest/config";
import * as path from "path";

export default defineConfig({
	test: {
		include: ["tests/**/*.test.ts"],
		setupFiles: ["tests/setup.ts"],
		alias: {
			obsidian: path.resolve(__dirname, "tests/__mocks__/obsidian.ts"),
		},
	},
});
