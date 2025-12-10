// eslint.config.mjs
import tsparser from "@typescript-eslint/parser";
import { defineConfig, globalIgnores } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";
import globals from "globals";

export default defineConfig([
	...obsidianmd.configs.recommended,
	globalIgnores(["**/node_modules/", "**/main.js", "out/", "*.*.ts"]),

	{
		files: ["**/*.ts"],
		languageOptions: {
			parser: tsparser,
			parserOptions: { project: "./tsconfig.json" },
			globals: {
				window: true,
				console: true,
				document: true,
			},
		},

		// Optional project overrides
		rules: {},
	},
]);
