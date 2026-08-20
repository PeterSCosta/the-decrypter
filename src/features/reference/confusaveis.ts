/**
 * Letras de outra escrita que se PARECEM com latinas.
 *
 * ── O DEFEITO QUE ISTO CONSERTA, MEDIDO ────────────────────────────────────
 * `а рorta рreta` (com о e р cirílicos) devolvia, no topo do leque e a **0,62**,
 * `"a rorta rreta"`. O `alfabeto` translitera por SOM — e por som o `р`
 * cirílico é mesmo `r`. Só que quem escondeu a letra na prova não escondeu um
 * som: escondeu um **desenho**. A resposta certa é `a porta preta`.
 *
 * Resposta errada com confiança é o pior defeito desta bancada, e esta era uma
 * das poucas que já estava em produção.
 *
 * ── POR QUE UM ARQUIVO NOVO, E NÃO UMA COLUNA EM `alphabets.ts` ────────────
 * Porque `alphabets.ts` é FONÉTICO por contrato, e `isPlainLatin`/`letterIndex`
 * dependem disso. `Привет мир` → `Privet mir` está **certo** e tem de continuar
 * saindo assim. As duas leituras coexistem; quem escolhe entre elas é o portão
 * do decoder, não a tabela.
 *
 * ── E POR QUE NÃO SE FUNDE COM `SYMBOL_GREEK` ─────────────────────────────
 * `fonts.ts` tem um mapa latino↔grego que PARECE o mesmo e não é: ele é o
 * encoding Symbol da Adobe (`C`→`Χ`, `Q`→`Θ`, `W`→`Ω`), onde a relação é de
 * teclado, não de desenho. Aqui `Χ`→`X` porque as duas se desenham igual. Há
 * teste prendendo que ninguém aponte um para o outro.
 *
 * ── O TAMANHO, PORQUE O PLANO SUPUNHA OUTRO ───────────────────────────────
 * O plano antigo previa carga sob demanda por causa do bundle. A tabela mede
 * **menos de 4 KB** — a ressalva estava superdimensionada em duas ordens de
 * grandeza, e há teste prendendo o tamanho para ela não voltar por boato.
 */

/** Os pares-base, escritos e conferidos um a um: intruso → latina que ele imita. */
const PARES_BASE: [string, string][] = [
  // ── Cirílico, minúsculas ──
  ["а", "a"],
  ["в", "b"],
  ["е", "e"],
  ["ѕ", "s"],
  ["і", "i"],
  ["ј", "j"],
  ["к", "k"],
  ["м", "m"],
  ["н", "h"],
  ["о", "o"],
  ["р", "p"],
  ["с", "c"],
  ["т", "t"],
  ["у", "y"],
  ["х", "x"],
  ["ԁ", "d"],
  ["ԛ", "q"],
  ["ԝ", "w"],
  ["һ", "h"],
  ["ѡ", "w"],
  ["ɡ", "g"],
  // ── Cirílico, maiúsculas ──
  ["А", "A"],
  ["В", "B"],
  ["Е", "E"],
  ["Ѕ", "S"],
  ["І", "I"],
  ["Ј", "J"],
  ["К", "K"],
  ["М", "M"],
  ["Н", "H"],
  ["О", "O"],
  ["Р", "P"],
  ["С", "C"],
  ["Т", "T"],
  ["У", "Y"],
  ["Х", "X"],
  ["Ԁ", "D"],
  ["Ԛ", "Q"],
  ["Ԝ", "W"],
  ["Ғ", "F"],
  ["Ӏ", "I"],
  ["Ү", "Y"],
  ["Ԍ", "G"],
  ["З", "3"],
  // ── Grego, minúsculas ──
  ["α", "a"],
  ["ε", "e"],
  ["ι", "i"],
  ["κ", "k"],
  ["ν", "v"],
  ["ο", "o"],
  ["ρ", "p"],
  ["τ", "t"],
  ["υ", "u"],
  ["χ", "x"],
  ["γ", "y"],
  ["η", "n"],
  ["ϲ", "c"],
  ["ѵ", "v"],
  // ── Grego, maiúsculas ──
  ["Α", "A"],
  ["Β", "B"],
  ["Ε", "E"],
  ["Ζ", "Z"],
  ["Η", "H"],
  ["Ι", "I"],
  ["Κ", "K"],
  ["Μ", "M"],
  ["Ν", "N"],
  ["Ο", "O"],
  ["Ρ", "P"],
  ["Τ", "T"],
  ["Υ", "Y"],
  ["Χ", "X"],
  ["Ϲ", "C"],
  ["Ϳ", "J"],
  ["Ω", "W"],
  ["Θ", "O"],
];

/**
 * A tabela completa: os pares-base mais as formas ACENTUADAS deles.
 *
 * `ё` é `е` + trema e continua parecendo um `e`; derivar por decomposição
 * evita escrever a lista à mão e evita esquecer metade dela.
 */
const construir = (): Map<string, string> => {
  const m = new Map(PARES_BASE);
  // Grego e cirílico ocupam U+0370–U+04FF; varrer a faixa e reaproveitar a base.
  for (let cp = 0x0370; cp <= 0x04ff; cp++) {
    const ch = String.fromCodePoint(cp);
    if (m.has(ch)) continue;
    const base = ch.normalize("NFD")[0];
    const latina = m.get(base);
    if (latina) m.set(ch, latina);
  }
  return m;
};

export const CONFUSAVEIS: ReadonlyMap<string, string> = construir();

export const ehConfusavel = (ch: string): boolean => CONFUSAVEIS.has(ch);

export interface TrocaConfusavel {
  /** O caractere intruso, como veio. */
  de: string;
  /** A latina que ele imita. */
  para: string;
  /** Posição no texto, 0-based. */
  em: number;
}

export interface LeituraConfusavel {
  texto: string;
  /** As posições trocadas — é isto que vira entrada do `letter-index`. */
  posicoes: number[];
  pares: TrocaConfusavel[];
}

/** Troca todo confusável pela latina que ele imita, guardando onde estavam. */
export function normalizaConfusaveis(texto: string): LeituraConfusavel {
  const pares: TrocaConfusavel[] = [];
  let saida = "";
  let i = 0;
  for (const ch of texto) {
    const latina = CONFUSAVEIS.get(ch);
    if (latina) {
      pares.push({ de: ch, para: latina, em: i });
      saida += latina;
    } else {
      saida += ch;
    }
    i += ch.length;
  }
  return { texto: saida, posicoes: pares.map((p) => p.em), pares };
}
