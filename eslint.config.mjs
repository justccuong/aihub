import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
	baseDirectory: __dirname,
});

const eslintConfig = [
	...compat.extends("next/core-web-vitals", "next/typescript"),
	{
		rules: {
			// Enforce no unused variables (warning for args starting with _)
			"@typescript-eslint/no-unused-vars": [
				"error",
				{ argsIgnorePattern: "^_", varsIgnorePattern: "^_" }
			],
			// Prefer const over let when variable is not reassigned
			"prefer-const": "error",
			// Warn on console.log but allow console.warn and console.error
			"no-console": ["warn", { allow: ["warn", "error"] }],
		}
	}
];

export default eslintConfig;

