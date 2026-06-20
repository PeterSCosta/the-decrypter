/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_W3W_API_KEY?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
