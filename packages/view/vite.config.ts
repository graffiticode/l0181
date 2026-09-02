// Library build: publishes @graffiticode/l0181-view (L0181's Form + the re-exported View) as ESM,
// with bundled types and an extracted style.css. React is external (peer dependency).
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import dts from "vite-plugin-dts";

// dist/style.css is ~1.4 MB because it carries KaTeX's fonts inline: Vite IGNORES
// `assetsInlineLimit` in library mode and always inlines, so there is no knob for it here.
// That cost lands only on npm consumers who bundle this package. The /form bundle — what a
// learner actually loads — is built by vite.embed.config.ts, which emits the fonts as files
// the browser fetches only when a card contains math.
export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      formats: ["es"],
      fileName: () => "index.js",
    },
    rollupOptions: {
      external: ["react", "react-dom", "react-dom/client", "react/jsx-runtime"],
    },
    sourcemap: true,
    emptyOutDir: true,
  },
  plugins: [react(), dts({ rollupTypes: true })],
});
