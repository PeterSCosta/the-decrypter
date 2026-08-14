import { bruteDecoder } from "../define";

/**
 * Reagrupamento de dígitos — o mecanismo integral de GIA-01 "Ask Me": a prova
 * espalha números pela prosa (`0,10`, `100`, `0,100`, `111`) e a OBS manda
 * ignorar as vírgulas; só a concatenação de TODOS os dígitos, repartida em
 * blocos de tamanho fixo, vira mensagem. O codec `binary` não alcança isso
 * porque exige os octetos já separados por espaço, e o `decimal` respeita a
 * largura dos tokens que o texto entrega — aqui a largura é justamente o que
 * está escondido.
 *
 * O portão é o que impede a cifra de sujar cada tecla: ≥ 16 dígitos, e cada
 * leitura só entra se TODOS os seus blocos caírem na faixa válida (imprimível e
 * majoritariamente letras, ou 1..26 no A1Z26). Sem isso, qualquer telefone ou
 * CPF colado na bancada geraria três cartões de lixo.
 */

const MIN_DIGITS = 16;
/** Acima disto a entrada é um arquivo, não uma prova — e o custo por tecla importa. */
const MAX_DIGITS = 2000;

function chunks(digits: string, size: number): string[] | null {
  if (digits.length % size !== 0) return null;
  const out: string[] = [];
  for (let i = 0; i < digits.length; i += size) out.push(digits.slice(i, i + size));
  return out;
}

/** Texto só passa se for todo imprimível e ao menos metade letras. */
function asPrintable(codes: number[]): string | null {
  if (!codes.every((c) => c >= 32 && c <= 126)) return null;
  const letters = codes.filter((c) => (c >= 65 && c <= 90) || (c >= 97 && c <= 122)).length;
  if (letters * 2 < codes.length) return null;
  return String.fromCharCode(...codes);
}

/** Um único 0 ou 27+ invalida a leitura A1Z26 inteira — é o filtro barato que faz o portão funcionar. */
function asA1Z26(values: number[]): string | null {
  if (!values.every((v) => v >= 1 && v <= 26)) return null;
  return values.map((v) => String.fromCharCode(64 + v)).join("");
}

interface Reading {
  size: number;
  label: string;
  /** Leitura binária: só se aplica quando os dígitos são apenas 0 e 1. */
  binary: boolean;
  read: (blocks: string[]) => string | null;
}

const READINGS: Reading[] = [
  {
    size: 8,
    binary: true,
    label: "binário, blocos de 8 (ASCII)",
    read: (b) => asPrintable(b.map((x) => Number.parseInt(x, 2))),
  },
  {
    size: 7,
    binary: true,
    label: "binário, blocos de 7 (ASCII)",
    read: (b) => asPrintable(b.map((x) => Number.parseInt(x, 2))),
  },
  {
    size: 6,
    binary: true,
    label: "binário, blocos de 6 → A1Z26",
    read: (b) => asA1Z26(b.map((x) => Number.parseInt(x, 2))),
  },
  {
    size: 5,
    binary: true,
    label: "binário, blocos de 5 → A1Z26",
    read: (b) => asA1Z26(b.map((x) => Number.parseInt(x, 2))),
  },
  {
    size: 4,
    binary: true,
    label: "binário, blocos de 4 → A1Z26",
    read: (b) => asA1Z26(b.map((x) => Number.parseInt(x, 2))),
  },
  {
    size: 3,
    binary: false,
    label: "ASCII decimal, blocos de 3",
    read: (b) => asPrintable(b.map(Number)),
  },
  {
    size: 2,
    binary: false,
    label: "ASCII decimal, blocos de 2",
    read: (b) => asPrintable(b.map(Number)),
  },
  {
    size: 2,
    binary: false,
    label: "A1Z26, blocos de 2",
    read: (b) => asA1Z26(b.map(Number)),
  },
];

export const decoders = bruteDecoder({
  id: "digit-regroup",
  name: "Reagrupar dígitos",
  category: "transform",
  keep: 3,
  variants(input) {
    const digits = input.replace(/\D+/g, "");
    if (digits.length < MIN_DIGITS || digits.length > MAX_DIGITS) return [];
    // Octetos já separados (ou uma tira nua de 0/1) são o território do codec
    // `binary`; duplicar o cartão dele seria ruído, não achado.
    if (/^[01]+$/.test(input.replace(/\s+/g, ""))) return [];

    const onlyBits = /^[01]+$/.test(digits);
    const out: { label: string; output: string }[] = [];
    for (const r of READINGS) {
      if (r.binary && !onlyBits) continue;
      const blocks = chunks(digits, r.size);
      if (!blocks) continue;
      const text = r.read(blocks);
      if (text) out.push({ label: r.label, output: text });
    }
    return out;
  },
});
