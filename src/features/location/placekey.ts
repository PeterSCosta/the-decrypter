/**
 * Placekey — o identificador de LUGAR do padrão homônimo.
 *
 * ── O FORMATO ───────────────────────────────────────────────────────────────
 * `zzw-22y@5vg-7gt-qzz` tem duas metades separadas por `@`:
 *   • antes do `@`, o **Quê** (o estabelecimento) — opcional e sem interesse
 *     aqui, porque depende do catálogo deles;
 *   • depois do `@`, o **Onde** — três trios que codificam um hexágono H3 de
 *     resolução 10. É essa metade que vira coordenada, e ela é 100% offline.
 *
 * ── COMO O "ONDE" VIRA H3 ───────────────────────────────────────────────────
 * Os nove caracteres são um número em base 36 (alfabeto próprio, sem vogais
 * para não formar palavra) que representa os bits úteis do índice H3. Para
 * remontar o índice de 64 bits: cabeçalho fixo `0x8a` no topo, o número no
 * meio, e — a parte que quebra quem improvisa — os dígitos NÃO USADOS da
 * resolução 15 precisam vir preenchidos com **7** (o "dígito vazio" do H3), e
 * não com zero. Preencher com zero produz um índice que o `h3-js` recusa.
 *
 * ── ASSINATURA ──────────────────────────────────────────────────────────────
 * O `@`. Sem ele, `khg-8w9-89z` é só três trios alfanuméricos — e MEDIDO: essa
 * forma dispara o decoder de vídeo do YouTube, porque tem onze caracteres de
 * base64url. Por isso este decoder exige o arroba.
 */

/** O alfabeto do Placekey: 28 caracteres, sem vogais, para não formar palavra. */
const ALFABETO = "23456789bcdfghjkmnpqrstvwxyz";

/**
 * O cabeçalho de uma célula H3 de resolução 10: modo 1, resolução 10.
 * `0x8a` no topo dos 64 bits.
 */
const CABECALHO = 0x8an << 52n;

/** O "empurrão de célula-base" que o padrão soma antes de cortar os bits. */
const EMPURRAO = 2n ** 45n;

/**
 * ── O DESLOCAMENTO É 9, E ISSO EU TIVE DE DERIVAR ───────────────────────────
 * A documentação fala em resolução 10, o que sugeriria cortar 15 bits (os cinco
 * dígitos não usados × 3). Testado contra o Placekey canônico, NÃO É: o código
 * carrega 9 bits a mais — o corte certo é 9, e sobram três dígitos para
 * preencher com 7. Com 15, o índice sai inválido e o `h3-js` recusa.
 *
 * Derivado assim: peguei o par publicado (`zzw-22y@5vg-7gt-qzz` = Ferry
 * Building, 37,7953 / −122,3940), calculei o H3 verdadeiro pela lib e comparei
 * com o número do código em base 28. A razão deu exatamente 64 (6 bits) mais
 * 63 — que são dois dígitos de 7. Com o corte em 9, os números batem na
 * igualdade, e a volta reproduz 37,7953 / −122,3940.
 */
const CORTE = 9n;

/** A parte "Onde", já sem o Quê e sem traços. */
function corpoOnde(entrada: string): string | null {
  const t = entrada.trim();
  if (!t.includes("@")) return null;
  const onde = t.slice(t.indexOf("@") + 1);
  const limpo = onde.replace(/-/g, "").toLowerCase();
  // Três trios = nove caracteres. Menos que isso é outra coisa.
  if (limpo.length !== 9) return null;
  return [...limpo].every((c) => ALFABETO.includes(c)) ? limpo : null;
}

/**
 * Placekey → índice H3 (string hex de 15 caracteres).
 *
 * Devolve `null` quando a forma não bate. Quem converte o H3 em coordenada é o
 * caminho que já existe em `formats.ts`, com a lib carregada sob demanda.
 */
export function placekeyParaH3(entrada: string): string | null {
  const corpo = corpoOnde(entrada);
  if (corpo === null) return null;

  let valor = 0n;
  for (const c of corpo) valor = valor * BigInt(ALFABETO.length) + BigInt(ALFABETO.indexOf(c));

  // A volta do corte, e depois os três dígitos que sobraram preenchidos com 7 —
  // o "dígito não usado" do H3. Preencher com ZERO produz um índice que a lib
  // recusa, e foi exatamente o que aconteceu na primeira tentativa.
  let indice = CABECALHO + (valor << CORTE) - EMPURRAO;
  for (let r = 13; r <= 15; r++) indice |= 7n << BigInt(3 * (15 - r));

  return indice.toString(16).padStart(15, "0");
}

/** Só para a tela: mostra se veio com a parte do estabelecimento. */
export function placekeyTemQue(entrada: string): boolean {
  const t = entrada.trim();
  const i = t.indexOf("@");
  return i > 0;
}
