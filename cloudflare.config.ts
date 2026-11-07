import { bindings, defineConfig, defineWorker } from "cf/config";

export default defineConfig({
  worker: defineWorker({
    name: "kundli-birth-chart-free",
    entrypoint: "vinext/server/fetch-handler",
    compatibilityDate: "2026-11-06",
    assets: {
      htmlHandling: "none",
      notFoundHandling: "none",
      runWorkerFirst: ["/*", "!/_next/static/*", "!/*/_next/static/*"],
    },
    env: {
      ASSETS: bindings.assets(),
      FREEASTRO_API_BASE: bindings.secret(),
      FREEASTRO_API_KEY: bindings.secret(),
    },
  }),
});
