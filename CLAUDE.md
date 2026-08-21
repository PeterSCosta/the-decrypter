# The Decrypter — project notes for Claude

Local-first **puzzle workbench**: one input → fan out across **136 ciphers/decoders** → rank by
plausibility. Used by a team in a treasure hunt in the Itajaí valley (Blumenau/Itajaí, SC), so the
datasets are hyperlocal: street guide, CEP, postes, pontes, municipalities, airports, CID-10.
Backed by **the-decrypter-api** (.NET, Postgres, Redis), which serves the big datasets and
centralises external lookups (cache, rate-limit, keys); login is **apelido or e-mail** + password
with manual admin approval. Portuguese-first UI (pt-BR).

## Stack

Vite 6 · React 19 · TypeScript (strict) · Tailwind v4 (`@theme` tokens in `src/index.css`) ·
Biome (lint+format) · Vitest. Design system: Voltage lime (`--brand` #c6f135) + ink, light default
with `html.dark` toggle. Use the semantic CSS vars (`--text-*`, `--surface-*`, `--border-*`,
`--brand`) — not raw hex.

## Architecture (feature-sliced)

- `src/features/decoder/engine/` — the core. `types.ts` (Decoder/DecodeCandidate), `define.ts`
  (authoring helpers: `mapDecoder` / `bruteDecoder` / `defineDecoder`), `registry.ts` (built-ins +
  **auto-glob** of `decoders/*.ts`), `run.ts` (run + score + rank + `partition`), `score.ts`
  (plausibility 0..1), `codecs.ts` (encodings), `ciphers.ts` (classical), `lookups.ts` (data-backed).
  **Add a decoder:** drop a `*.ts` in `engine/decoders/` exporting `decoders` — it auto-registers.
  See `engine/decoders/README.md`. `bruteDecoder` auto-scores variants; don't score plaintext by hand.
- `src/features/{street-guide,cep}/` — `types.ts`, `search.ts`, `use-*.ts`, `components/`.
- `src/lib/data.ts` — lazy, cached fetch of the datasets still served as static files
  (`public/data/`: streets, bridges, the word lists). CEP, municipalities, airports, postes and
  CID-10 moved to the API — see `src/lib/lookup-cache.ts`, which multiplexes them into a single
  `/api/lookup?q=` call so the 136-decoder fan-out runs **once** per keystroke, not once per
  dataset. `src/lib/cn.ts`, `src/lib/use-debounced-value.ts`.
- `src/components/ui/` (primitives) + `src/components/layout/` (topbar, theme toggle). `App.tsx` =
  **16 tabs**, listed once in `src/app-tabs.ts` (a `Record<TabId, …>` so a missing entry is a
  compile error, plus `ORDEM` for the order): Decodificador, Arquivo, Lote, Texto, Posições,
  Matriz, Diferenças, Anagramas, Fontes, Cola, Retrato, Geolocalização, Triangulação, Postes,
  Biblioteca, Frota. The map-bearing ones are `React.lazy` — Leaflet must not sit in the entry
  chunk. `src/app-tabs.test.ts` reads `App.tsx` and fails if a tab has no render branch: a tab with
  a button and no screen produces a blank area and **no error anywhere**.
- Tests colocated as `*.test.ts`.

## Data

`scripts/build-*.ts` generate the datasets from `data-sources/` (gitignored raw inputs) into either
`public/data/` (still fetched by the browser) or `seed-data/` (only ever read by the API's seeder —
CEP, municípios, postes, aeroportos, CID-10). Generated JSON is committed. Regenerate with
`pnpm build:data`, and note it currently **fails on a clean clone**: `build:ceps` needs a CSV that
is gitignored.

## Conventions

- Decoders are **sync** and **pure**; lookups read datasets from `DecodeContext` (null until loaded —
  return `[]`). Use a fatal `TextDecoder` so byte-garbage yields no candidate.
- CEP wildcard rules live in `cep-pattern.ts`: 8-char = anchored mask; shorter = substring; `x*?_`
  are single-digit wildcards; dashes/dots/spaces stripped.
- Keep `onSuccess`/`onError`-style callbacks out of effect/memo deps.

## Commands

Node via nvm — if missing: `export PATH="$HOME/.nvm/versions/node/$(ls $HOME/.nvm/versions/node | tail -1)/bin:$PATH"`.
`pnpm dev | build | typecheck | lint | format | test | build:data`.
