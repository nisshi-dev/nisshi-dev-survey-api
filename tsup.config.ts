import { defineConfig } from "tsup";

export default defineConfig({
	entry: { index: "src/server/entry-vercel.ts" },
	outDir: "api",
	format: "esm",
	target: "node20",
	platform: "node",
	noExternal: [/.*/],
	external: ["pg-native"],
	banner: {
		js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
	},
});
