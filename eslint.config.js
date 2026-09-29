import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

// The core (src/core/) is the centre of the onion: it may import only other
// files inside src/core/. Bare specifiers (npm packages, node: builtins) are
// always blocked. Relative imports are blocked when they climb out of
// src/core/, which depends on how deep the importing file sits, so one
// override is generated per directory depth.
const CORE_MAX_DEPTH = 4;
const bareImport = {
  regex: "^(?!\\.\\.?/)",
  message: "src/core/ imports nothing from outside itself: no packages.",
};
const coreBoundary = Array.from({ length: CORE_MAX_DEPTH + 1 }, (_, depth) => ({
  files: [`src/core/${"*/".repeat(depth)}*.{ts,tsx}`],
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          bareImport,
          {
            regex: `^(\\.\\./){${depth + 1},}`,
            message: "src/core/ imports nothing from outside itself.",
          },
        ],
      },
    ],
  },
}));

export default defineConfig([
  globalIgnores(["dist", "coverage", ".netlify"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ["src/**/*.tsx"],
    extends: [reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
  },
  {
    files: ["netlify/**/*.ts", "scripts/**/*.ts", "*.config.{js,ts}"],
    languageOptions: { globals: globals.node },
  },
  {
    // Core: no I/O, DOM, network, storage, environment or clock access.
    files: ["src/core/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-globals": [
        "error",
        ...[
          "window",
          "document",
          "fetch",
          "localStorage",
          "sessionStorage",
          "navigator",
          "XMLHttpRequest",
          "process",
        ].map((name) => ({
          name,
          message: "src/core/ is pure: pass runtime values in as arguments.",
        })),
      ],
      "no-restricted-properties": [
        "error",
        {
          object: "Date",
          property: "now",
          message: "src/core/ does not read the clock: pass `today` in.",
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message: "src/core/ does not read the clock: pass `today` in.",
        },
      ],
    },
  },
  ...coreBoundary,
  prettier,
]);
