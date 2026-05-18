// eslint.config.mjs
import tsparser from "@typescript-eslint/parser";
import { defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";
import tseslint from "typescript-eslint";

export default defineConfig([
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsparser,
      parserOptions: { project: "./tsconfig.json" },
    },
    extends: [
      tseslint.configs.recommendedTypeChecked,
      ...obsidianmd.configs.recommended,
    ],
    rules: {
      //"eslintimport/no-extraneous-dependencies": off,
      // your overrides here
    },
  },
]);
