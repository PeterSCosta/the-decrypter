import {
  type Currency,
  currenciesBySymbol,
  currencyByCode,
  currencyByNum,
  retiredCurrency,
} from "@/features/reference/currency";
import type { CodeHit } from "@/features/reference/phone-codes";
import { defineDecoder } from "../define";

/**
 * Moeda ISO 4217: código alfabético (USD), numérico (840) ou símbolo (R$).
 * Fecha a cadeia "país → moeda → símbolo/valor" das provas de gincana.
 *
 * O gate é a tabela fechada da norma — 178 códigos ativos —, e não "três letras
 * quaisquer": um trio que não seja moeda não acende cartão nenhum. É por isso
 * que dá para conviver com o `airport` (IATA também tem 3 letras, 83 códigos
 * batem nos dois): são consultas diferentes, e as duas aparecem para o usuário
 * escolher.
 */

const ID = "moeda";
const NAME = "Moeda (ISO 4217)";

/** Resposta determinística sobre tabela fechada — pode disputar o topo. */
const SCORE_CODE = 0.72;
/** Um número de 3 dígitos é bem mais ambíguo que um trio de letras. */
const SCORE_NUM = 0.5;
const SCORE_LIST = 0.66;
const SCORE_SYMBOL = 0.55;
/** Símbolo com mais de um dono responde, mas sem brigar pelo primeiro lugar. */
const SCORE_SYMBOL_AMBIGUOUS = 0.42;
const SCORE_RETIRED = 0.5;

/** Acima disso não é consulta de moeda, é texto — nem tenta. */
const MAX_TOKENS = 6;

function decimals(c: Currency): string {
  if (c.digits === null) return "casas decimais: não se aplica";
  return c.digits === 1 ? "1 casa decimal" : `${c.digits} casas decimais`;
}

function toHit(c: Currency): CodeHit {
  return {
    code: c.code,
    name: c.symbol ? `${c.name} · ${c.symbol}` : c.name,
    detail: `nº ${c.num} · ${decimals(c)} · ${c.places}`,
  };
}

/** Um token vira moeda por código alfabético ou por código numérico. */
function resolve(token: string): Currency | undefined {
  const t = token.toUpperCase();
  if (/^[A-Z]{3}$/.test(t)) return currencyByCode(t);
  if (/^\d{3}$/.test(t)) return currencyByNum(t);
  return undefined;
}

export const decoders = defineDecoder({
  id: ID,
  name: NAME,
  category: "lookup",
  decode(input) {
    const raw = input.trim();
    if (!raw) return [];

    // Símbolo primeiro: "R$" e "€" não sobrevivem à quebra em tokens.
    const bySymbol = currenciesBySymbol(raw);
    if (bySymbol.length) {
      const hits = bySymbol.map(toHit);
      const ambiguous = bySymbol.length > 1;
      return [
        {
          decoderId: ID,
          decoderName: NAME,
          category: "lookup",
          label: ambiguous
            ? `${raw} — símbolo de mais de uma moeda`
            : `${raw} — ${bySymbol[0].name}`,
          output: bySymbol.map((c) => `${c.code} → ${c.name}`).join(" · "),
          notes: `símbolo ${raw}`,
          forcedScore: ambiguous ? SCORE_SYMBOL_AMBIGUOUS : SCORE_SYMBOL,
          chainValue: bySymbol.map((c) => c.code).join(" "),
          render: "code-list",
          data: hits,
        },
      ];
    }

    const tokens = raw.split(/[\s,;/·|]+/).filter(Boolean);
    if (!tokens.length || tokens.length > MAX_TOKENS) return [];

    const found: Currency[] = [];
    let allAlpha = true;
    for (const t of tokens) {
      const c = resolve(t);
      if (!c) return retired(tokens);
      if (/^\d/.test(t)) allAlpha = false;
      if (!found.some((f) => f.code === c.code)) found.push(c);
    }

    const score =
      found.length > 1 || tokens.length > 1 ? SCORE_LIST : allAlpha ? SCORE_CODE : SCORE_NUM;
    // Encadeia a outra face do código: quem entrou por 840 leva USD adiante.
    const chainValue = found.map((c) => (allAlpha ? c.num : c.code)).join(" ");
    return [
      {
        decoderId: ID,
        decoderName: NAME,
        category: "lookup",
        label: found.map((c) => c.name).join(" · "),
        output: found.map((c) => `${c.code} → ${c.name}`).join(" · "),
        notes: found.map((c) => `${c.code} = ${c.num}`).join(" · "),
        forcedScore: score,
        chainValue,
        render: "code-list",
        data: found.map(toHit),
      },
    ];
  },
});

/** Fallback: código que já foi moeda e saiu da norma (DEM, HRK, BGN…). */
function retired(tokens: string[]) {
  if (tokens.length !== 1) return [];
  const old = retiredCurrency(tokens[0]);
  if (!old) return [];
  const detail = `válido até ${old.until} · substituída por ${old.replacedBy}`;
  return [
    {
      decoderId: ID,
      decoderName: NAME,
      category: "lookup" as const,
      label: `${old.name} (retirada)`,
      output: `${old.code} → ${old.name} (moeda retirada, hoje ${old.replacedBy})`,
      notes: detail,
      forcedScore: SCORE_RETIRED,
      chainValue: old.replacedBy,
      render: "code-list" as const,
      data: [{ code: old.code, name: `${old.name} — retirada`, detail }] satisfies CodeHit[],
    },
  ];
}
