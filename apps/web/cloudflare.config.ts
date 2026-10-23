import { bindings, defineConfig, defineWorker } from "cf/config";

const d1DatabaseId = process.env.PLAYGROWTH_D1_DATABASE_ID;

export default defineConfig({
  worker: defineWorker({
    name: "playgrowth-ai",
    entrypoint: "vinext/server/fetch-handler",
    compatibilityDate: "2026-10-19",
    compatibilityFlags: ["nodejs_compat"],
    assets: {
      htmlHandling: "none",
      notFoundHandling: "none",
      runWorkerFirst: ["/*", "!/_next/static/*", "!/*/_next/static/*"],
    },
    env: {
      ASSETS: bindings.assets(),
      PLAYGROWTH_DB: bindings.d1({
        name: 'playgrowth-ai',
        ...(d1DatabaseId ? { id: d1DatabaseId } : {}),
      }),
    },
  }),
});
