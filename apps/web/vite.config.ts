import { defineConfig } from "vite";
import vinext from "vinext";
import { cloudflare } from "@cloudflare/vite-plugin";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  build: {
    // This virtual specifier is provided by the Workers runtime after the RSC
    // build is complete; keep it as a runtime import in the server bundle.
    rolldownOptions: {
      external: ['cloudflare:workers'],
    },
  },
  resolve: {
    // Vinext resolves the workspace's TypeScript entrypoint before package
    // exports. Pin the CSS subpath to the actual workspace file.
    alias: {
      "@playgrowth/ui/styles.css": fileURLToPath(
        new URL("../../packages/ui/src/styles.css", import.meta.url),
      ),
    },
  },
  plugins: [
    vinext(),
    cloudflare({
      viteEnvironment: {
        name: "rsc",
        childEnvironments: ["ssr"],
      },
    }),
  ],
});
