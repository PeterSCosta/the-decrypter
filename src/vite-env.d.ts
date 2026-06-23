/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base do backend the-decrypter-api (ex.: https://apiarromba.thelogiclab.com.br). */
  readonly VITE_API_BASE_URL?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
