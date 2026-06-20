import { cipherDecoders } from "./ciphers";
import { codecDecoders } from "./codecs";
import { lookupDecoders } from "./lookups";
import type { Decoder } from "./types";

/**
 * The decoder registry.
 *
 * Built-in groups are listed explicitly below. **Custom decoders are
 * auto-discovered**: any `*.ts` file in `./decoders/` that exports a `decoders`
 * value (or a default) is picked up here with zero extra wiring — just drop the
 * file in. See `decoders/README.md`.
 */
type DecoderModule = {
  decoders?: Decoder | Decoder[];
  default?: Decoder | Decoder[];
};

const customModules = import.meta.glob<DecoderModule>("./decoders/*.ts", { eager: true });

const customDecoders: Decoder[] = Object.entries(customModules)
  .filter(([path]) => !path.includes(".test.")) // ignore colocated tests
  .flatMap(([, mod]) =>
    [mod.decoders, mod.default]
      .flatMap((value) => (Array.isArray(value) ? value : value ? [value] : []))
      .filter((d): d is Decoder => typeof d?.id === "string" && typeof d?.decode === "function"),
  );

const all: Decoder[] = [...lookupDecoders, ...codecDecoders, ...cipherDecoders, ...customDecoders];

// Surface accidental id collisions early (dev only).
if (import.meta.env?.DEV) {
  const seen = new Set<string>();
  for (const d of all) {
    if (seen.has(d.id)) console.warn(`[decrypter] id de decodificador duplicado: "${d.id}"`);
    seen.add(d.id);
  }
}

export const decoders: Decoder[] = all;
