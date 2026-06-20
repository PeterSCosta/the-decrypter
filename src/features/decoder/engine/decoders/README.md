# Add a cipher / decoder

Drop a `*.ts` file in **this folder** that exports `decoders` (one decoder or an
array). It's **auto-registered** — no edits to `registry.ts` or anywhere else.
Restart `pnpm dev` if it was already running.

```ts
// engine/decoders/my-cipher.ts
import { mapDecoder } from "../define";

export const decoders = mapDecoder({
  id: "my-cipher",          // unique
  name: "Minha Cifra",      // shown on the result card (pt-BR)
  category: "classical",    // "encoding" | "classical" | "transform" | "lookup"
  decode(input /*, ctx */) {
    if (!/* applies? */ true) return null;   // null = skip (no card)
    return transform(input);                 // string, or { output, label?, notes? }
  },
});
```

The output is **scored automatically** and ranked against every other decoder —
you never set a score for plaintext. Return `null` whenever the input doesn't
look like your format, so you don't add noise.

## Three helpers (`../define.ts`)

| Helper | Use it for | Returns |
| --- | --- | --- |
| `mapDecoder` | one input → one output (most ciphers, encodings) | `string \| { output, label?, notes?, … } \| null` |
| `bruteDecoder` | unknown parameter — try many, keep the best | `{ label, output }[]` via `variants`; set `keep` (default 3) |
| `defineDecoder` | full control — return raw `DecodeCandidate[]` | a complete `Decoder` object |

**Examples in the codebase:**
- `mapDecoder` → `leetspeak.ts`, `polybius.ts` (here); also `codecs.ts`.
- `bruteDecoder` → `ciphers.ts` (Caesar tries 25 shifts, affine tries a/b, keeps the most readable).
- Keyed cipher → read `ctx.key` (the topbar key field); see Vigenère in `ciphers.ts`.

## Data-backed lookups

To resolve a number/code against a dataset (like the street/CEP lookups),
return the rich object with a fixed score and a custom renderer:

```ts
return { output: summary, forcedScore: 0.95, render: "street", data: rows };
```

`render: "street" | "cep"` draws the dedicated card; `data` is the payload.
Read datasets from `ctx.streets` / `ctx.ceps` (they're `null` until loaded —
return `null` in that case). See `lookups.ts`.
