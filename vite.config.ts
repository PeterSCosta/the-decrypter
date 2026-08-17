import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/**
 * Hash de conteúdo de cada arquivo de `public/data`, embutido no bundle.
 *
 * O Vite não renomeia o que está em `public/` — os datasets saem com o nome
 * original, então o nginx só podia dar a eles `expires 1d`: todo mundo
 * rebaixava o vocabulário e as bases uma vez por dia, para sempre, mesmo sem
 * nada ter mudado. Com o hash na query (`/data/ceps.json?v=ab12cd34`) o arquivo
 * passa a ser cacheável para sempre, e uma base regerada muda de URL sozinha.
 *
 * Um hash por arquivo, não um id de build: assim regerar só os postes não
 * invalida os 2,9 MB de CEP.
 */
function hashesDosDatasets(): Record<string, string> {
  const dir = resolve(fileURLToPath(new URL(".", import.meta.url)), "public/data");
  if (!existsSync(dir)) return {};
  const out: Record<string, string> = {};
  for (const nome of readdirSync(dir)) {
    out[nome] = createHash("sha1")
      .update(readFileSync(resolve(dir, nome)))
      .digest("hex")
      .slice(0, 8);
  }
  return out;
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __DATA_HASHES__: JSON.stringify(hashesDosDatasets()),
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
