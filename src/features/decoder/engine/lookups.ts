import { type CepHit, formatCep, toHit } from "@/features/cep/types";
import { type StreetRow, type StreetsData, nomeCompleto } from "@/features/street-guide/types";
import type { Decoder } from "./types";

// Lazily-built indexes, cached per dataset instance.
const codeIdx = new WeakMap<StreetsData, Map<number, StreetRow[]>>();
const lawIdx = new WeakMap<StreetsData, Map<number, StreetRow[]>>();

function buildIndex(
  rows: StreetRow[],
  key: (r: StreetRow) => number | null,
): Map<number, StreetRow[]> {
  const m = new Map<number, StreetRow[]>();
  for (const r of rows) {
    const k = key(r);
    if (k === null) continue;
    const list = m.get(k);
    if (list) list.push(r);
    else m.set(k, [r]);
  }
  return m;
}

function streetCodeIndex(data: StreetsData): Map<number, StreetRow[]> {
  let m = codeIdx.get(data);
  if (!m) {
    m = buildIndex(data.rows, (r) => r.codigo);
    codeIdx.set(data, m);
  }
  return m;
}

function streetLawIndex(data: StreetsData): Map<number, StreetRow[]> {
  let m = lawIdx.get(data);
  if (!m) {
    m = buildIndex(data.rows, (r) => r.numLei);
    lawIdx.set(data, m);
  }
  return m;
}

const summarize = (rows: StreetRow[]) =>
  rows.map((r) => `${nomeCompleto(r)} — bairro ${r.bairro}`).join("; ");

// ---- Street código → rua --------------------------------------------------
const streetCode: Decoder = {
  id: "street-code",
  name: "Código de rua (Blumenau)",
  category: "lookup",
  decode(input, ctx) {
    if (!ctx.streets || !/^\d{1,5}$/.test(input.trim())) return [];
    const rows = streetCodeIndex(ctx.streets).get(Number(input.trim()));
    if (!rows || rows.length === 0) return [];
    return [
      {
        decoderId: "street-code",
        decoderName: "Código de rua (Blumenau)",
        category: "lookup",
        label: `código ${input.trim()}`,
        output: summarize(rows),
        forcedScore: 0.97,
        render: "street",
        data: rows,
      },
    ];
  },
};

// ---- Nº da Lei → rua(s) ---------------------------------------------------
const streetLaw: Decoder = {
  id: "street-law",
  name: "Nº da Lei (Blumenau)",
  category: "lookup",
  decode(input, ctx) {
    if (!ctx.streets || !/^\d{1,5}$/.test(input.trim())) return [];
    const rows = streetLawIndex(ctx.streets).get(Number(input.trim()));
    if (!rows || rows.length === 0) return [];
    return [
      {
        decoderId: "street-law",
        decoderName: "Nº da Lei (Blumenau)",
        category: "lookup",
        label: `lei ${input.trim()} · ${rows.length} rua(s)`,
        output: summarize(rows),
        forcedScore: 0.9,
        render: "street",
        data: rows,
      },
    ];
  },
};

// ---- Exact CEP → endereço -------------------------------------------------
const cepLookup: Decoder = {
  id: "cep-exact",
  name: "CEP (Santa Catarina)",
  category: "lookup",
  decode(input, ctx) {
    if (!ctx.ceps) return [];
    const digits = input.replace(/\D/g, "");
    if (digits.length !== 8) return [];
    const hits: CepHit[] = [];
    for (const row of ctx.ceps.rows) {
      if (row[0] === digits) hits.push(toHit(row, ctx.ceps.municipios));
    }
    if (hits.length === 0) return [];
    return [
      {
        decoderId: "cep-exact",
        decoderName: "CEP (Santa Catarina)",
        category: "lookup",
        label: formatCep(digits),
        output: hits.map((h) => `${h.logradouro || h.localidade}, ${h.municipio}`).join("; "),
        forcedScore: 0.95,
        render: "cep",
        data: hits,
      },
    ];
  },
};

export const lookupDecoders: Decoder[] = [streetCode, streetLaw, cepLookup];
