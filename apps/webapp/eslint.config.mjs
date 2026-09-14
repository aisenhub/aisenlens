import eslint from "@eslint/js"
import reactHooks from "eslint-plugin-react-hooks"
import reactRefresh from "eslint-plugin-react-refresh"
import typescript from "typescript-eslint"

export default typescript.config(
  {
    ignores: ["dist/**", "node_modules/**", "test-results/**"],
  },
  eslint.configs.recommended,
  ...typescript.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      "no-undef": "off",
      "no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "react-hooks/rules-of-hooks": "error",
        // Existing media/editor effects intentionally use stable lifecycle
        // boundaries; dependency auditing is tracked separately before it is
        // promoted to a blocking rule.
        "react-hooks/exhaustive-deps": "off",
      "react-refresh/only-export-components": "off",
    },
  },
)
