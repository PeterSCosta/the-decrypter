import {
  type CodeMatch,
  type Country,
  type CountryScheme,
  SCHEME_ORDER,
  matchCode,
  matchCountryText,
} from "@/features/reference/countries";
import type { CodeHit } from "@/features/reference/phone-codes";
import { defineDecoder } from "../define";
import type { DecodeCandidate, DecodeContext } from "../types";

const ID = "pais";
const NAME = "País (ISO 3166)";

/**
 * País: converte entre as tabelas de código de país — alpha-2 (BR), alpha-3
 * (BRA), numérico (076), ccTLD (.br), COI (GER), FIFA e placa internacional —
 * porque a prova dá um código e pede outro. Também aceita o nome e a capital.
 *
 * O PORTÃO, que aqui é tudo: 267 das 676 combinações de duas letras são código
 * de país em alguma tabela (39%!), e 367 sequências de três letras também. Um
 * decoder solto viraria ruído em qualquer sigla. Então: só
 * MAIÚSCULAS, e **todos** os tokens da entrada precisam ser código válido —
 * "SC" resolve Seicheles, "SC casa" não resolve nada. Número exige três
 * dígitos ("076", não "76"), senão "84 79 80 79" viraria cartão de país; a
 * forma de um dígito só (placa "D" da Alemanha) fica reservada ao modo "uma
 * cifra só", onde quem escolheu foi o usuário.
 *
 * As LEITURAS ALTERNATIVAS são o valor real: ROU é alpha-3 da Romênia e placa
 * do Uruguai; WAL é País de Gales na FIFA e Serra Leoa na placa; CAM é Camboja
 * no COI e Camarões na placa. Em vez de escolher, a bancada mostra as duas,
 * com a leitura do ISO na frente.
 */

// O hífen separa porque o enunciado escreve "BRA-ARG"; ele não abre buraco no
// portão: em "111.444.777-35" e "12-03-2024" as partes continuam não sendo código.
const SEP = /[\s,;/·|-]+/;
const SCORE: Record<CountryScheme, number> = {
  ccTLD: 0.8,
  "alpha-3": 0.75,
  COI: 0.75,
  FIFA: 0.75,
  "alpha-2": 0.6,
  placa: 0.55,
  numérico: 0.45,
};

/** Prioridades de leitura. A primeira é a oficial; as outras só desempatam. */
const ORDERS: CountryScheme[][] = [
  SCHEME_ORDER,
  ["COI", ...SCHEME_ORDER],
  ["FIFA", ...SCHEME_ORDER],
  ["placa", ...SCHEME_ORDER],
];

/** Forma canônica do token, ou null quando ele não é forma de código. */
function normToken(raw: string, only: boolean): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (/^\.[A-Za-z]{2}$/.test(t)) return t.toLowerCase();
  if (/^\d+$/.test(t)) {
    if (t.length === 3) return t;
    // "76" só vira "076" quando o usuário apontou para este decoder.
    return only && t.length <= 3 ? t.padStart(3, "0") : null;
  }
  if (/^[A-Z]{2,3}$/.test(t)) return t;
  return only && /^[A-Za-z]{1,3}$/.test(t) ? t.toUpperCase() : null;
}

/** Posição da leitura mais forte deste match na ordem de prioridade. */
function rank(m: CodeMatch, order: CountryScheme[]): number {
  return Math.min(...m.schemes.map((s) => order.indexOf(s)));
}

/** A tabela que respondeu por este match, dada a prioridade da leitura. */
function usedScheme(m: CodeMatch, order: CountryScheme[]): CountryScheme {
  return order[rank(m, order)];
}

/**
 * Uma linha por CÓDIGO, não por tabela: é a tabela de conversão que a prova
 * cobra, e o mesmo código costuma valer em várias (BRA é alpha-3, COI e FIFA;
 * a placa do Brasil é o próprio BR). Repetir a linha só encheria o cartão.
 */
function conversionRows(c: Country, m: CodeMatch): CodeHit[] {
  const labels = new Map<string, string[]>();
  const add = (code: string, label: string) => {
    if (!code) return;
    const seen = labels.get(code);
    if (seen) seen.push(label);
    else labels.set(code, [label]);
  };
  add(c.a2, "alpha-2");
  add(c.a3, "alpha-3");
  add(c.num, "numérico");
  add(c.tld, "ccTLD");
  add(c.ioc, "COI");
  add(c.fifa, "FIFA");
  add(c.car, "placa");
  if (m.nation) add(m.code, `FIFA (${m.nation})`);

  return [...labels].map(([code, names]) =>
    code === c.a2
      ? // A primeira linha é a identidade: o nome do país, não o rótulo da tabela.
        {
          code,
          name: c.name,
          detail: [names.join(" · "), c.capital, c.region].filter(Boolean).join(" · "),
        }
      : { code, name: names.join(" · ") },
  );
}

/** Numa lista, cada país cabe em uma linha — a tabela inteira não caberia. */
function listRow(m: CodeMatch, order: CountryScheme[]): CodeHit {
  const c = m.country;
  const extra = [c.tld, c.ioc && c.ioc !== c.a3 ? `COI ${c.ioc}` : ""].filter(Boolean).join(" · ");
  return {
    code: m.code,
    name: m.nation ? `${c.name} (${m.nation})` : c.name,
    detail: `${usedScheme(m, order)} · ${c.a2} ${c.a3} ${c.num}${extra ? ` · ${extra}` : ""}`,
  };
}

function candidate(o: {
  label: string;
  output: string;
  notes: string;
  score: number;
  chainValue: string;
  rows: CodeHit[];
}): DecodeCandidate {
  return {
    decoderId: ID,
    decoderName: NAME,
    category: "lookup",
    label: o.label,
    output: o.output,
    notes: o.notes,
    forcedScore: o.score,
    chainValue: o.chainValue,
    render: "code-list",
    data: o.rows,
  };
}

/** Entrada em código: um token, ou uma lista deles. */
function fromCodes(input: string, only: boolean): DecodeCandidate[] {
  const raw = input.trim().split(SEP).filter(Boolean);
  if (raw.length === 0) return [];
  const perToken: CodeMatch[][] = [];
  for (const t of raw) {
    const code = normToken(t, only);
    if (!code) return [];
    const ms = matchCode(code);
    // Um token sem país derruba a entrada inteira — é o que impede o decoder
    // de opinar sobre prosa em caixa alta.
    if (ms.length === 0) return [];
    perToken.push(ms);
  }

  const out: DecodeCandidate[] = [];
  const seen = new Set<string>();
  for (const order of ORDERS) {
    const picked = perToken.map((ms) => [...ms].sort((a, b) => rank(a, order) - rank(b, order))[0]);
    const key = picked.map((m) => `${m.country.a2}:${m.nation ?? ""}`).join(",");
    if (seen.has(key)) continue;
    seen.add(key);

    const schemes = picked.map((m) => usedScheme(m, order));
    const base = Math.min(...schemes.map((s) => SCORE[s]));
    // Uma letra só (placa "D") é a forma mais frágil que existe: só chega aqui
    // no modo "uma cifra só", e ainda assim marca menos.
    const thin = picked.some((m) => m.code.length === 1) ? 0.05 : 0;
    const alt = out.length > 0 ? 0.06 : 0;
    // Dois códigos seguidos que fecham não acontecem por acaso; um sozinho, sim.
    const many = picked.length > 1 ? 0.05 : 0;
    const names = picked.map((m) => m.country.name);
    const nums = picked.map((m) => m.country.num);
    out.push(
      candidate({
        label: [...new Set(schemes)].join(" · "),
        output: names.join(" · "),
        notes: picked
          .map((m, i) => `${m.code} → ${schemes[i]} → ${m.nation ?? m.country.name}`)
          .join(" · "),
        score: Math.min(Math.max(base + many - alt - thin, 0.36), 0.85),
        // O numérico é o que encadeia: vira dígito para a próxima cifra.
        chainValue: nums.join(" "),
        rows:
          picked.length === 1
            ? conversionRows(picked[0].country, picked[0])
            : picked.map((m) => listRow(m, order)),
      }),
    );
  }
  return out;
}

/** Entrada em nome ou capital: "Portugal" → POR, PRT, 620. */
function fromText(input: string): DecodeCandidate[] {
  const hit = matchCountryText(input);
  if (!hit) return [];
  const c = hit.country;
  const m: CodeMatch = { country: c, schemes: ["alpha-2"], code: c.a2 };
  const codes = [c.a2, c.a3, c.num, c.tld].filter(Boolean);
  if (c.ioc && c.ioc !== c.a3) codes.push(`COI ${c.ioc}`);
  if (c.fifa && c.fifa !== c.a3) codes.push(`FIFA ${c.fifa}`);
  return [
    candidate({
      label: hit.by,
      output: codes.join(" · "),
      notes: `${hit.by === "capital" ? `${c.capital} é a capital de ` : ""}${c.name} · ${c.region}`,
      score: hit.by === "nome" ? 0.72 : 0.6,
      chainValue: c.num,
      rows: conversionRows(c, m),
    }),
  ];
}

/** Domínio inteiro ("uol.com.br") — o país mora no último rótulo. */
function fromDomain(input: string): DecodeCandidate[] {
  const t = input.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9.-]*\.[a-z]{2}$/.test(t)) return [];
  const ms = matchCode(t.slice(t.lastIndexOf(".")));
  if (ms.length === 0) return [];
  const c = ms[0].country;
  return [
    candidate({
      label: "domínio",
      output: c.name,
      notes: `${c.tld} → ${c.name}`,
      score: 0.55,
      chainValue: c.num,
      rows: conversionRows(c, ms[0]),
    }),
  ];
}

export const decoders = defineDecoder({
  id: ID,
  name: NAME,
  category: "lookup",
  decode(input: string, ctx: DecodeContext) {
    const only = ctx.only === ID;
    const codes = fromCodes(input, only);
    if (codes.length > 0) return codes;
    const text = fromText(input);
    return text.length > 0 ? text : fromDomain(input);
  },
});
