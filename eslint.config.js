import js from "@eslint/js";

const browserGlobals = {
  window: "readonly",
  document: "readonly",
  console: "readonly",
  localStorage: "readonly",
  alert: "readonly",
  setTimeout: "readonly",
  clearTimeout: "readonly",
  setInterval: "readonly",
  clearInterval: "readonly",
  requestAnimationFrame: "readonly",
  cancelAnimationFrame: "readonly",
  Blob: "readonly",
  URL: "readonly",
  crypto: "readonly",
  structuredClone: "readonly",
  HTMLInputElement: "readonly",
  HTMLSelectElement: "readonly",
  HTMLButtonElement: "readonly",
  HTMLElement: "readonly",
  HTMLImageElement: "readonly",
  Element: "readonly",
  FileReader: "readonly",
  TextEncoder: "readonly",
  navigator: "readonly",
  location: "readonly",
  confirm: "readonly",
  btoa: "readonly",
  atob: "readonly",
  prompt: "readonly"
};

export default [
  js.configs.recommended,
  {
    files: ["**/*.js"],
    ignores: ["node_modules/**", "functions/**"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: browserGlobals
    },
    rules: {
      "no-undef": "error",
      "no-unused-vars": "warn",
      "no-empty": ["error", { allowEmptyCatch: true }]
    }
  },
  {
    files: ["test-smoke.js", "tests/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...browserGlobals,
        process: "readonly",
        __dirname: "readonly"
      }
    }
  },
  {
    files: ["functions/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: {
        ...browserGlobals,
        module: "readonly",
        require: "readonly",
        exports: "writable",
        process: "readonly"
      }
    },
    rules: {
      "no-undef": "off"
    }
  }
];
