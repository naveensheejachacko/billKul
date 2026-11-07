import { defineConfig } from "tsup";

// Published build: ES modules + CommonJS, with type declarations for both.
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  target: "es2020",
  sourcemap: false,
  splitting: false,
  treeshake: true,
});
