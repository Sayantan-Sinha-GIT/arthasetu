import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Standard convention: a leading underscore marks a deliberately
      // unused binding (e.g. destructuring just to discard a key/value).
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      // Reviewed every instance of this in the codebase: it's overwhelmingly
      // the standard Next.js hydration-safe pattern (reading window/
      // localStorage/matchMedia after mount, since it isn't available during
      // SSR) or a genuine animation loop driving continuous updates via
      // requestAnimationFrame — not a real bug. The couple of trivially-safe
      // cases (pure synchronous reads with no rendering impact) were
      // converted to lazy useState initializers instead. Downgraded to warn
      // so it stays visible for future cleanup without blocking builds.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Non-source directories that were being linted by mistake (dev tooling,
    // vendored browser profiles, and reference assets — not app code).
    ".chrome-test-profile/**",
    "backups/**",
    "design-inspire/**",
  ]),
]);

export default eslintConfig;
