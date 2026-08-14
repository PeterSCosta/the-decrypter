import { mapDecoder } from "../define";
import { stripDiacritics } from "../util";

/**
 * Datas como chave (GIA-13 *O Código SONGI*): uma lista de datas vira a inicial
 * do signo de cada uma — `11/07-29/03-23/11-…` → CASCAVEL. Uma data sozinha vira
 * um painel de derivados (signo, dia da semana, dia do ano, serial do Excel,
 * Unix, fase da lua).
 *
 * Toda a aritmética é inteira ou `Date.UTC`: `new Date("…")` local já rendeu bug
 * de fuso neste projeto (a data volta um dia em UTC−03).
 */

const DAY_MS = 86_400_000;

/** Signo que COMEÇA em cada mês (1-based) e o dia em que ele começa. */
const SIGN_STARTING_IN: string[] = [
  "",
  "Aquário",
  "Peixes",
  "Áries",
  "Touro",
  "Gêmeos",
  "Câncer",
  "Leão",
  "Virgem",
  "Libra",
  "Escorpião",
  "Sagitário",
  "Capricórnio",
];
const SIGN_STARTS_ON = [0, 21, 20, 21, 21, 21, 21, 22, 23, 23, 23, 22, 22];

/** Zeller devolve 0 = sábado; a ordem abaixo segue essa convenção. */
const WEEKDAYS = [
  "sábado",
  "domingo",
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
];

const MOON_PHASES = [
  "Nova",
  "Crescente côncava",
  "Quarto crescente",
  "Crescente gibosa",
  "Cheia",
  "Minguante gibosa",
  "Quarto minguante",
  "Minguante côncava",
];

const SYNODIC_DAYS = 29.530588853;
/** Lua nova de referência: 06/01/2000 18:14 UTC. */
const NEW_MOON_MS = Date.UTC(2000, 0, 6, 18, 14);

const DAYS_IN_MONTH = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const DAYS_BEFORE_MONTH = [0, 0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];

interface ParsedDate {
  day: number;
  month: number;
  /** null quando a entrada é `dd/mm` — metade dos derivados fica de fora. */
  year: number | null;
  text: string;
}

function isLeap(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

/**
 * O portão de entrada do decoder: sem barra e sem ISO, não é data. É o que
 * impede `2019 2010 1949 1905` (ano solto) de virar lista de datas. Sem ano, dia
 * e mês têm de vir com dois dígitos — `3/4` é fração, `05/10` é data.
 */
function parseDate(token: string): ParsedDate | null {
  let day: number;
  let month: number;
  let year: number | null = null;

  const iso = token.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const br = token.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const short = token.match(/^(\d{2})\/(\d{2})$/);
  if (iso) {
    year = Number(iso[1]);
    month = Number(iso[2]);
    day = Number(iso[3]);
  } else if (br) {
    day = Number(br[1]);
    month = Number(br[2]);
    year = Number(br[3]);
  } else if (short) {
    day = Number(short[1]);
    month = Number(short[2]);
  } else {
    return null;
  }

  if (month < 1 || month > 12 || day < 1) return null;
  // sem ano, 29/02 continua válida (existe em ano bissexto)
  const max = month === 2 && (year === null || isLeap(year)) ? 29 : DAYS_IN_MONTH[month];
  if (day > max) return null;
  if (year !== null && (year < 1583 || year > 9999)) return null;
  return { day, month, year, text: token };
}

/**
 * Quebra a entrada em tokens de data. O separador da prova é o hífen
 * (`11/07-29/03-…`), mas hífen também é o separador do ISO — por isso só um
 * token que já contém barra é dividido por hífen.
 */
function tokenize(input: string): string[] {
  const out: string[] = [];
  for (const chunk of input.trim().split(/[\s,;]+/)) {
    if (!chunk) continue;
    if (chunk.includes("/")) out.push(...chunk.split(/[-–—]/).filter(Boolean));
    else out.push(chunk);
  }
  return out;
}

function zodiac(d: ParsedDate): string {
  if (d.day >= SIGN_STARTS_ON[d.month]) return SIGN_STARTING_IN[d.month];
  const prev = d.month === 1 ? 12 : d.month - 1;
  return SIGN_STARTING_IN[prev];
}

/** Inicial sem acento: Áries → A, e não "Á". */
function initial(sign: string): string {
  return stripDiacritics(sign).charAt(0).toUpperCase();
}

function dayOfYear(d: ParsedDate): number {
  const bissexto = d.year !== null && isLeap(d.year) && d.month > 2 ? 1 : 0;
  return DAYS_BEFORE_MONTH[d.month] + d.day + bissexto;
}

/** Congruência de Zeller (calendário gregoriano). */
function weekday(day: number, month: number, year: number): string {
  const m = month < 3 ? month + 12 : month;
  const y = month < 3 ? year - 1 : year;
  const k = y % 100;
  const j = Math.floor(y / 100);
  const h =
    (day + Math.floor((13 * (m + 1)) / 5) + k + Math.floor(k / 4) + Math.floor(j / 4) + 5 * j) % 7;
  return WEEKDAYS[h];
}

/**
 * Serial de data do Excel: dias desde 30/12/1899. O −1 antes de 01/03/1900 paga
 * o bug histórico do Excel, que considera 1900 bissexto.
 */
function excelSerial(utcMs: number): number | null {
  const serial = Math.round((utcMs - Date.UTC(1899, 11, 30)) / DAY_MS);
  if (serial < 1) return null;
  return utcMs < Date.UTC(1900, 2, 1) ? serial - 1 : serial;
}

/** Fase aproximada: idade lunar média, sem correção de excentricidade. */
function moonPhase(utcMs: number): string {
  const age = ((((utcMs - NEW_MOON_MS) / DAY_MS) % SYNODIC_DAYS) + SYNODIC_DAYS) % SYNODIC_DAYS;
  const bin = Math.floor((age / SYNODIC_DAYS) * 8 + 0.5) % 8;
  return MOON_PHASES[bin];
}

function panel(d: ParsedDate) {
  const sign = zodiac(d);
  const parts = [d.text, sign];
  if (d.year === null) {
    parts.push(`dia ${dayOfYear(d)} do ano (ano comum)`);
    return {
      output: parts.join(" · "),
      label: sign,
      notes: `Sem o ano só dá para ler o signo — escreva ${d.text}/2026 para dia da semana, serial do Excel, Unix e fase da lua.`,
      forcedScore: 0.5,
      chainValue: sign,
    };
  }
  const utcMs = Date.UTC(d.year, d.month - 1, d.day);
  parts.push(weekday(d.day, d.month, d.year), `dia ${dayOfYear(d)} do ano`);
  const serial = excelSerial(utcMs);
  if (serial !== null) parts.push(`Excel ${serial}`);
  parts.push(`Unix ${Math.round(utcMs / 1000)}`);
  return {
    output: parts.join(" · "),
    label: sign,
    notes: `Fase da lua (aproximada): ${moonPhase(utcMs)}`,
    forcedScore: 0.5,
    chainValue: sign,
  };
}

export const decoders = mapDecoder({
  id: "date-key",
  name: "Data como chave",
  category: "transform",
  decode(input) {
    const tokens = tokenize(input);
    if (tokens.length === 0) return null;
    const dates: ParsedDate[] = [];
    for (const t of tokens) {
      const d = parseDate(t);
      if (d === null) return null; // um token estranho derruba a leitura inteira
      dates.push(d);
    }

    if (dates.length === 1) return panel(dates[0]);
    // Duas datas dariam duas letras: sinal curto demais para separar de ruído.
    if (dates.length < 3) return null;

    // Sem forcedScore de propósito: o scorer é o autocheck da prova — se as
    // iniciais formarem palavra (CASCAVEL) o candidato sobe sozinho.
    const signs = dates.map(zodiac);
    return {
      output: signs.map(initial).join(""),
      label: "iniciais dos signos",
      notes: dates.map((d, i) => `${d.text} ${signs[i]}`).join(" · "),
    };
  },
});
