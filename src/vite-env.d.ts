/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base do backend the-decrypter-api (ex.: https://apiarromba.thelogiclab.com.br). */
  readonly VITE_API_BASE_URL?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/**
 * Hash de conteúdo de cada arquivo de `public/data`, injetado em build time
 * (ver `vite.config.ts`). Vira a query `?v=` das URLs dos datasets, que é o que
 * permite ao nginx guardá-los como imutáveis.
 */
declare const __DATA_HASHES__: Record<string, string>;
