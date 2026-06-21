import { type CepHit, formatCep, toHit } from "@/features/cep/types";
import { type StreetRow, type StreetsData, nomeCompleto } from "@/features/street-guide/types";
import type { Decoder } from "./types";
import { stripDiacritics } from "./util";

// Lazily-built indexes, cached per dataset instance.
const codeIdx = new WeakMap<StreetsData, Map<number, StreetRow[]>>();
const lawIdx = new WeakMap<StreetsData, Map<number, StreetRow[]>>();
const nameIdx = new WeakMap<StreetsData, { row: StreetRow; folded: string }[]>();

const fold = (s: string) => stripDiacritics(s).toLowerCase().trim();

function streetNameIndex(data: StreetsData): { row: StreetRow; folded: string }[] {
  let arr = nameIdx.get(data);
  if (!arr) {
    arr = data.rows.map((row) => ({ row, folded: fold(row.nome) }));
    nameIdx.set(data, arr);
  }
  return arr;
}

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

// ---- Data da Lei → rua(s) -------------------------------------------------
const streetDate: Decoder = {
  id: "street-date",
  name: "Data da Lei (Blumenau)",
  category: "lookup",
  decode(input, ctx) {
    if (!ctx.streets) return [];
    const q = input.trim();
    // formato de data: só dígitos/barras, com ao menos uma barra e um dígito
    if (!/^[\d/]+$/.test(q) || !q.includes("/") || !/\d/.test(q)) return [];
    const rows = ctx.streets.rows.filter((r) => r.dataLei?.includes(q));
    if (rows.length === 0) return [];
    const shown = rows.slice(0, 50);
    return [
      {
        decoderId: "street-date",
        decoderName: "Data da Lei (Blumenau)",
        category: "lookup",
        label: `data ${q} · ${rows.length} rua(s)`,
        output: summarize(shown),
        forcedScore: 0.85,
        render: "street",
        data: shown,
      },
    ];
  },
};

// ---- Nome da rua → rua(s) -------------------------------------------------
const streetName: Decoder = {
  id: "street-name",
  name: "Nome de rua (Blumenau)",
  category: "lookup",
  decode(input, ctx) {
    if (!ctx.streets) return [];
    const q = input.trim();
    // texto curto, com letra (ignora números/datas — tratados pelos outros)
    if (q.length < 3 || q.length > 40 || q.includes("\n") || !/\p{L}/u.test(q)) return [];
    const fq = fold(q);
    if (fq.length < 3) return [];

    const matches = streetNameIndex(ctx.streets).filter((e) => e.folded.includes(fq));
    if (matches.length === 0) return [];

    // ranqueia: nome exato > começa com > contém; depois nome mais curto
    const rank = (f: string) => (f === fq ? 0 : f.startsWith(fq) ? 1 : 2);
    matches.sort((a, b) => rank(a.folded) - rank(b.folded) || a.folded.length - b.folded.length);
    const best = rank(matches[0].folded);
    const score = best === 0 ? 0.92 : best === 1 ? 0.78 : 0.62;
    const rows = matches.slice(0, 8).map((m) => m.row);

    return [
      {
        decoderId: "street-name",
        decoderName: "Nome de rua (Blumenau)",
        category: "lookup",
        label: `"${q}" · ${matches.length} rua(s)`,
        output: summarize(rows),
        forcedScore: score,
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

export const lookupDecoders: Decoder[] = [streetCode, streetLaw, streetDate, streetName, cepLookup];
