# The Decrypter

A local, no-backend **puzzle workbench**. Paste anything into a single input and the app fans it
out across ~25 ciphers and decoders, then ranks the results by how much they **look like real text**
(plausible Portuguese/English) — so the likely answer floats to the top and gibberish sinks.

It also folds in two datasets used for puzzles in **Blumenau, SC**:

- **Guia de Ruas (Blumenau)** — the official *Rol de Ruas com Gabaritos* (4,426 streets). Look up a
  street by its **código**, its **Nº da Lei**, name or bairro. Numeric input in the decoder is
  auto-resolved (e.g. `3722` → *R ABACATE*; `6416` → every street under that law).
- **CEPs de Santa Catarina** — 40k postal codes with a **wildcard pattern search**:
  `88xxx500` (starts 88, ends 500), `x8300000` (wildcard anywhere), `88010-500`, partials, etc.
  `x`/`*`/`?`/`_` are single-digit wildcards; digits are fixed.

Ciphers, scoring and the local datasets run entirely in the browser. Lookups that
need a key, a rate limit or a shared cache (CNPJ, CEP, ISBN, NCM, PIX, what3words,
geocoding, fleet) go through **the-decrypter-api**. Access is gated by e-mail +
password with **manual approval** — an admin releases each account.

## Stack

Vite 6 · React 19 · TypeScript (strict) · Tailwind v4 · Biome · Vitest. Voltage lime + ink design
system (light default, dark toggle).

## Commands

> Node is installed via **nvm**. If `node` isn't found, prefix commands with:
> `export PATH="$HOME/.nvm/versions/node/$(ls $HOME/.nvm/versions/node | tail -1)/bin:$PATH"`

```bash
pnpm install      # install deps (native build scripts pre-approved in pnpm-workspace.yaml)
pnpm dev          # dev server (http://localhost:5173)
pnpm build        # typecheck + production build
pnpm typecheck    # tsc --noEmit
pnpm lint         # biome check     (pnpm format to auto-fix)
pnpm test         # vitest
pnpm build:data   # regenerate public/data/*.json from data-sources/ (see below)
```

## How it works

- **Decoders** live in `src/features/decoder/engine/`. Each returns zero or more candidate outputs;
  `run.ts` scores every candidate with `score.ts` (printable gate + letter-frequency cosine +
  stopword hits) and ranks them. Brute-force ciphers (Caesar, rail fence, affine) self-select their
  best shifts/params. **Add a decoder** by dropping a `*.ts` file in `engine/decoders/` that exports
  `decoders` — it's auto-registered, no wiring. Use the `mapDecoder` / `bruteDecoder` helpers from
  `engine/define.ts`; full guide in
  [`engine/decoders/README.md`](src/features/decoder/engine/decoders/README.md).
- **Data lookups** (street código / Nº da Lei / exact CEP) are decoders too, with a high fixed score.
- **Datasets** are compact JSON in `public/data/`, fetched lazily and indexed in memory
  (`Map` for exact lookups, regex for the CEP wildcard). At 40k rows this is instant — no DB needed.

## Data pipeline

`public/data/*.json` is generated from the raw sources in `data-sources/` (gitignored — see
[`data-sources/README.md`](data-sources/README.md)). Regenerate with `pnpm build:data`.
The generated JSON is committed, so the app runs without the raw sources present.
