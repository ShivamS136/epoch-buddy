import js from "@eslint/js";
import globals from "globals";
import prettier from "eslint-config-prettier";

export default [
  {
    // Never lint dependencies, zips, generated config, or the bundled
    // artifacts (those are esbuild output, not hand-authored source).
    ignores: [
      "node_modules/",
      "dist/",
      "assets/",
      "extension/index.js",
      "extension/script.js",
      "extension/welcome.js",
      "extension/background.js",
      "docs/demo.js",
      "src/shared/generated/",
    ],
  },

  js.configs.recommended,

  {
    // Honor the codebase's `_`-prefix convention for intentionally-unused
    // bindings (e.g. `catch (_err)`, unused callback args).
    rules: {
      "no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },

  {
    // Browser + WebExtension source: popup, content script, demo, shared.
    files: ["src/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.webextensions,
      },
    },
  },

  {
    // Hand-authored marketing script, loaded via a plain <script> tag.
    files: ["docs/nav.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: { ...globals.browser },
    },
  },

  {
    // Node build/tooling scripts.
    files: ["scripts/**/*.mjs", "eslint.config.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.node },
    },
  },

  // Keep ESLint out of Prettier's lane (disables stylistic rules).
  prettier,
];
