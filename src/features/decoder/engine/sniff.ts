import { gs1CheckDigit } from "@/features/codes/barcode";
import { isValidCnpj, isValidCpf, onlyDigits } from "@/features/documents/validate";
import { lookupDDD } from "@/features/reference/phone-codes";
import type { DecodeContext } from "./types";

/**
 * Sniffer de formato — "isto tem cara de…".
 *
 * **Não é decoder, por projeto.** O `runDecoders` deduplica por `output` exato e
 * corta abaixo de 0.35, então um sinalizador genérico ou canibalizaria
 * candidatos reais ou precisaria de um `forcedScore` que empurra respostas de
 * verdade para baixo. Aqui ele vive fora da corrida, como uma faixa de chips.
 *
 * O valor exclusivo é o **diagnóstico negativo**: hoje um decoder que não se
 * aplica devolve `[]` em silêncio, e a barreira histórica nº 1 do acervo é
 * justamente confundir ASCII com A1Z26.
 */

export interface Hint {
  id: string;
  /** Texto curto do chip. */
  label: string;
  /** Linha de explicação. */
  detail?: string;
  /** Decoder sugerido — clicar no chip roda só ele. */
  decoderId?: string;
  /** Valor pronto para jogar na entrada (ex.: a lista já dividida pelo MDC). */
  chainValue?: string;
  tone?: "info" | "warn";
}

const numbersIn = (input: string): number[] =>
  input
    .split(/[^0-9]+/)
    .filter(Boolean)
    .map(Number)
    .filter((n) => Number.isFinite(n));

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/** Números soltos: ASCII, A1Z26, aritmética latente. */
function sniffNumbers(input: string, out: Hint[]): void {
  const nums = numbersIn(input);
  if (nums.length < 2) return;

  const all = (fn: (n: number) => boolean) => nums.every(fn);

  // A barreira nº 1 do acervo: ASCII confundido com A1Z26.
  if (all((n) => n >= 32 && n <= 126) && !all((n) => n >= 1 && n <= 26)) {
    out.push({
      id: "ascii-not-a1z26",
      label: "é ASCII, não A1Z26",
      detail: `valores ${Math.min(...nums)}–${Math.max(...nums)} caem na faixa imprimível do ASCII; fora de 1–26 o A1Z26 não se aplica`,
      decoderId: "decimal",
    });
  } else if (all((n) => n >= 1 && n <= 26)) {
    out.push({
      id: "a1z26-range",
      label: "todos entre 1 e 26",
      detail: "faixa exata do A1Z26 (número ↔ letra)",
      decoderId: "a1z26",
    });
  }

  // MDC > 1: a dica costuma ser uma palavra só ("em comum") e o resultado da
  // divisão é que vira a camada seguinte.
  if (nums.length >= 3 && all((n) => n > 0)) {
    const g = nums.reduce((acc, n) => gcd(acc, n));
    if (g > 1) {
      const divided = nums.map((n) => n / g);
      out.push({
        id: "gcd",
        label: `MDC = ${g}`,
        detail: `dividindo: ${divided.join(" ")}`,
        chainValue: divided.join(" "),
      });
    }
  }

  // Quadrados perfeitos: "Prova Quadrada" e parentes.
  if (nums.length >= 3 && all((n) => n > 0 && Number.isInteger(Math.sqrt(n)))) {
    out.push({
      id: "squares",
      label: "quadrados perfeitos",
      detail: `raízes: ${nums.map((n) => Math.sqrt(n)).join(" ")}`,
      chainValue: nums.map((n) => Math.sqrt(n)).join(" "),
    });
  }

  // DDDs: cadeia coordenada → cidade → telefone.
  if (nums.length >= 3 && all((n) => n >= 11 && n <= 99)) {
    const hits = nums.map((n) => lookupDDD(String(n)));
    if (hits.every((h) => h && h.length > 0)) {
      out.push({
        id: "all-ddd",
        label: "todos são DDD válidos",
        detail: nums.map((n, i) => `${n} ${hits[i]?.[0]?.name ?? ""}`).join(" · "),
        decoderId: "ddd",
      });
    }
  }
}

/** Documentos e códigos com dígito verificador — o diagnóstico negativo. */
function sniffCheckDigits(input: string, out: Hint[]): void {
  const d = onlyDigits(input);

  if (d.length === 13) {
    const ok = gs1CheckDigit(d.slice(0, 12)) === Number(d[12]);
    out.push(
      ok
        ? { id: "ean-ok", label: "EAN-13 válido", decoderId: "barcode" }
        : {
            id: "ean-bad",
            label: "13 dígitos, mas o DV do EAN não fecha",
            detail: `o dígito verificador deveria ser ${gs1CheckDigit(d.slice(0, 12))}, não ${d[12]}`,
            tone: "warn",
          },
    );
  }

  if (d.length === 11 && !isValidCpf(d)) {
    out.push({
      id: "cpf-bad",
      label: "11 dígitos, mas não é CPF válido",
      detail: "o DV não fecha — provavelmente é telefone, sequência ou outra coisa",
      tone: "warn",
    });
  }

  if (d.length === 14 && !isValidCnpj(d)) {
    out.push({
      id: "cnpj-bad",
      label: "14 dígitos, mas não é CNPJ válido",
      detail: "o DV não fecha",
      tone: "warn",
    });
  }
}

/** Formatos de geocódigo reconhecíveis pela forma. */
function sniffGeoShapes(input: string, out: Hint[]): void {
  const t = input.trim();

  if (/^\d{4,6}(?:\.\d{2})+$/.test(t)) {
    out.push({
      id: "geotude-shape",
      label: "tem cara de GeoTude",
      detail: "grade decimal aninhada: índice inicial e pares de dígitos",
      decoderId: "location",
    });
  }

  if (/^[0-9A-Z]{2,5}\.[0-9A-Z]{2,4}$/i.test(t) && /[A-Z]/i.test(t)) {
    out.push({
      id: "mapcode-shape",
      label: "tem cara de Mapcode",
      detail: "mapcode local não decodifica sem território — a bancada assume BR-SC primeiro",
      decoderId: "location",
    });
  }

  if (/^(?:\/\/\/)?[\p{L}]+\.[\p{L}]+\.[\p{L}]+$/u.test(t)) {
    out.push({
      id: "w3w-shape",
      label: "tem cara de what3words",
      detail: "três palavras separadas por ponto — a coordenada vem por consulta ao backend",
      decoderId: "location",
    });
  }
}

/** Dígitos que, reagrupados, parecem uma coordenada do Vale. */
function sniffCoordinateBlocks(input: string, out: Hint[]): void {
  const blocks = input
    .split(/\n\s*\n|\s{2,}|\n/)
    .map((b) => onlyDigits(b))
    .filter(Boolean);
  if (blocks.length !== 2) return;
  const [a, b] = blocks;
  if (a.length < 6 || b.length < 6) return;
  const lat = -Number(`${a.slice(0, 2)}.${a.slice(2)}`);
  const lng = -Number(`${b.slice(0, 2)}.${b.slice(2)}`);
  if (lat > -30 && lat < -25 && lng > -54 && lng < -48) {
    out.push({
      id: "coord-blocks",
      label: "possível coordenada",
      detail: `${lat}, ${lng} — dentro de Santa Catarina`,
      chainValue: `${lat}, ${lng}`,
      decoderId: "location",
    });
  }
}

/**
 * Roda todas as regras. Puro e barato — chamado no mesmo `useMemo` do fan-out.
 */
export function sniff(input: string, _ctx: DecodeContext): Hint[] {
  const out: Hint[] = [];
  if (!input.trim()) return out;
  sniffNumbers(input, out);
  sniffCheckDigits(input, out);
  sniffGeoShapes(input, out);
  sniffCoordinateBlocks(input, out);
  return out;
}
