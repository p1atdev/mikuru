import { cloudflare } from "@cloudflare/vite-plugin";
import { defineConfig } from "vite";
import type { Plugin } from "vite";
import { readFile } from "node:fs/promises";
import ssrPlugin from "vite-ssr-components/plugin";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { parse as parseYaml } from "yaml";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    cloudflare({
      configPath: "../../wrangler.toml",
    }),
    ssrPlugin(),
    yamlPlugin(),
  ],
});

function yamlPlugin(): Plugin {
  return {
    name: "mikuru-yaml",
    async load(id) {
      if (!id.endsWith(".yaml") && !id.endsWith(".yml")) {
        return null;
      }

      const yaml = await readFile(id, "utf8");
      return {
        code: `export default ${JSON.stringify(parseYaml(yaml))};`,
        map: null,
      };
    },
  };
}
