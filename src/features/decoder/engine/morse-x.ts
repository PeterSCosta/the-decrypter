import { MORSE_PARA_LETRA } from "./codecs";

/**
 * O dialeto de Morse que o Pollux e o Morbit usam — com `x` de separador.
 *
 * ── POR QUE UM DIALETO, E NÃO O MORSE DA CASA ─────────────────────────────
 * O `decodeMorse` de `codecs.ts` separa letra por ESPAÇO e palavra por `/`.
 * As duas cifras que codificam Morse em dígito não têm espaço para gastar:
 * elas embutem o separador no próprio alfabeto, como um terceiro símbolo. Por
 * convenção da literatura clássica ele se escreve `x`: um `x` fecha a letra,
 * dois fecham a palavra, três não existem.
 *
 * ── E POR QUE O CONJUNTO DE PREFIXOS EXISTE ───────────────────────────────
 * `PREFIXOS` é o que torna a busca viável. Sem ele, um solver precisa montar a
 * mensagem inteira antes de descobrir que o terceiro símbolo já era impossível.
 * Com ele, a busca aborta no prefixo — e medido, isso vale de 4× a 50×,
 * dependendo da cifra.
 */

/** Todo prefixo de todo código de Morse conhecido, inclusive os completos. */
export const PREFIXOS: ReadonlySet<string> = (() => {
  const s = new Set<string>();
  for (const codigo of Object.keys(MORSE_PARA_LETRA)) {
    for (let i = 1; i <= codigo.length; i++) s.add(codigo.slice(0, i));
  }
  return s;
})();

/** O código de Morse mais longo que existe na tabela — o teto da busca. */
export const MAX_SIMBOLOS = Math.max(...Object.keys(MORSE_PARA_LETRA).map((c) => c.length));

/**
 * `..x.x` → `IE`. `null` quando a sequência não é Morse válido.
 *
 * Recusa `xxx` (não existe separador triplo) e código mais longo que a tabela.
 */
export function decodeMorseX(seq: string): string | null {
  let out = "";
  let atual = "";
  let xs = 0;

  for (const ch of seq) {
    if (ch === "x") {
      xs++;
      if (xs > 2) return null;
      if (atual) {
        const letra = MORSE_PARA_LETRA[atual];
        if (!letra) return null;
        out += letra;
        atual = "";
      } else if (xs === 2) {
        out += " ";
      }
      if (xs === 2 && out.at(-1) !== " ") out += " ";
      continue;
    }
    if (ch !== "." && ch !== "-") return null;
    xs = 0;
    atual += ch;
    if (atual.length > MAX_SIMBOLOS || !PREFIXOS.has(atual)) return null;
  }

  if (atual) {
    const letra = MORSE_PARA_LETRA[atual];
    if (!letra) return null;
    out += letra;
  }
  return out.trim();
}

const LETRA_PARA_MORSE: Record<string, string> = Object.fromEntries(
  Object.entries(MORSE_PARA_LETRA).map(([codigo, letra]) => [letra, codigo]),
);

/** `IE` → `..x.`. O inverso, para o teste de ida e volta e para o `encode`. */
export function encodeMorseX(texto: string): string {
  const partes: string[] = [];
  for (const palavra of texto.toUpperCase().trim().split(/\s+/)) {
    const letras: string[] = [];
    for (const ch of palavra) {
      const codigo = LETRA_PARA_MORSE[ch];
      if (codigo) letras.push(codigo);
    }
    if (letras.length) partes.push(letras.join("x"));
  }
  return partes.join("xx");
}
