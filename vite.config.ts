import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
	resolve: {
		alias: { "@": path.resolve(import.meta.dirname, "./src") },
	},
	ssr: { noExternal: true },
	build: {
		ssr: "src/server/entry-vercel.ts",
		outDir: "api",
		rollupOptions: {
			external: ["pg-native"],
			output: { entryFileNames: "index.js" },
		},
	},
});
