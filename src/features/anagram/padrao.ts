import { fold } from "./solve";

/**
 * BUSCA DE PALAVRA POR PADRÃO — o que fazer quando os solvers calam.
 *
 * ── O BURACO QUE ELA TAPA ──────────────────────────────────────────────────
 * O solver de substituição não emite abaixo de 200 letras e o quebrador de
 * Vigenère precisa de 150 — medidos, e os pisos são honestos. Só que a prova
 * curta existe: seis letras num muro, uma palavra num acróstico, um criptograma
 * de uma frase. Abaixo do piso a bancada **cala**, e calar é o segundo pior
 * comportamento dela.
 *
 * Esta busca é o que sobra quando a estatística não alcança: a pessoa sabe a
 * FORMA da palavra e pergunta quais existem.
 *
 * ── AS DUAS SINTAXES, E POR QUE SÃO DUAS ───────────────────────────────────
 *
 * **Molde** — letra é literal, `?` é uma letra qualquer, `*` é um trecho
 * qualquer (inclusive vazio):
 *
 *     `a??`      → aba, ace, ata, ave…
 *     `*ção`     → ação, coração, canção…
 *     `p?nt?`    → ponte, pinta, penta…
 *
 * **Repetição** — dígitos marcam letras IGUAIS entre si, e classes diferentes
 * têm de ser letras diferentes:
 *
 *     `1221`     → anna, otto (1ª = 4ª, 2ª = 3ª, e as duas classes diferem)
 *     `123231`   → o molde de um criptograma de 6 letras
 *
 * A segunda é a que resolve criptograma curto, e é por isso que ela existe
 * separada: num criptograma **não se sabe** que letra é qual — só se sabe onde
 * a mesma letra se repete. Um molde com `?` não captura isso.
 *
 * ── O QUE ELA NÃO FAZ ──────────────────────────────────────────────────────
 * Não decide, não pontua, não emite card. Devolve a lista de palavras que têm a
 * forma pedida, e quem escolhe é quem está jogando. Por isso ela vive na aba
 * Anagramas, e não no leque: uma lista de 400 palavras candidatas é uma
 * ferramenta, não uma resposta.
 */

export type TipoPadrao = "molde" | "repeticao" | "invalido";

export interface PadraoLido {
  tipo: TipoPadrao;
  /** Quantas letras a palavra tem de ter; `null` quando há `*`. */
  comprimento: number | null;
  /** Explicação em pt-BR do que a busca vai fazer — vai para a tela. */
  descricao: string;
}

/** Teto de resultados. Acima disto a lista deixa de ser leitura e vira ruído. */
export const MAX_RESULTADOS = 400;

const SO_DIGITOS = /^[0-9]+$/;
const MOLDE_VALIDO = /^[a-z?*]+$/;

/** Lê o padrão e diz o que ele é — antes de varrer 451 mil palavras. */
export function lerPadrao(bruto: string): PadraoLido {
  const p = fold(bruto.trim());
  if (!p) return { tipo: "invalido", comprimento: null, descricao: "" };

  if (SO_DIGITOS.test(p)) {
    const classes = new Set(p).size;
    return {
      tipo: "repeticao",
      comprimento: p.length,
      descricao: `${p.length} letras, ${classes} letra${classes > 1 ? "s" : ""} distinta${classes > 1 ? "s" : ""} — dígitos iguais são a mesma letra, dígitos diferentes são letras diferentes.`,
    };
  }

  if (MOLDE_VALIDO.test(p)) {
    const temEstrela = p.includes("*");
    return {
      tipo: "molde",
      comprimento: temEstrela ? null : p.length,
      descricao: temEstrela
        ? "As letras são literais, `?` é uma letra qualquer e `*` é um trecho qualquer."
        : `${p.length} letras. As letras são literais e cada \`?\` é uma letra qualquer.`,
    };
  }

  return {
    tipo: "invalido",
    comprimento: null,
    descricao: "Use letras, `?`, `*` — ou só dígitos, para o molde de repetição.",
  };
}

/** O molde vira regex ancorada; `?` e `*` são as únicas metacaracteres. */
function regexDoMolde(p: string): RegExp {
  const corpo = [...p].map((c) => (c === "?" ? "[a-z]" : c === "*" ? "[a-z]*" : c)).join("");
  return new RegExp(`^${corpo}$`);
}

/**
 * A assinatura de repetição de uma palavra, canônica.
 *
 * `anna` → `1221`, `otto` → `1221`, `casa` → `1232`. Numera as letras pela
 * ordem em que aparecem, então duas palavras com a mesma forma dão a mesma
 * assinatura, quaisquer que sejam as letras.
 */
export function assinaturaDeRepeticao(palavra: string): string {
  const visto = new Map<string, number>();
  let proximo = 1;
  let out = "";
  for (const c of palavra) {
    let n = visto.get(c);
    if (n === undefined) {
      n = proximo++;
      visto.set(c, n);
    }
    out += n;
  }
  return out;
}

/**
 * Busca as palavras que casam com o padrão.
 *
 * @param palavras o vocabulário — vem do índice de anagramas, que a aba já tem
 *   carregado; esta função não busca dado nenhum.
 */
export function buscarPorPadrao(
  palavras: Iterable<string>,
  bruto: string,
  limite = MAX_RESULTADOS,
): { lido: PadraoLido; achados: string[]; truncado: boolean } {
  const lido = lerPadrao(bruto);
  if (lido.tipo === "invalido") return { lido, achados: [], truncado: false };

  const p = fold(bruto.trim());
  const achados: string[] = [];
  let total = 0;

  if (lido.tipo === "repeticao") {
    // Canoniza o padrão do usuário pela mesma regra: `2332` e `1221` são a
    // mesma forma, e quem digitou o primeiro espera o resultado do segundo.
    const alvo = assinaturaDeRepeticao(p);
    for (const w of palavras) {
      const f = fold(w);
      if (f.length !== p.length) continue;
      if (assinaturaDeRepeticao(f) !== alvo) continue;
      total++;
      if (achados.length < limite) achados.push(w);
    }
  } else {
    const re = regexDoMolde(p);
    for (const w of palavras) {
      if (!re.test(fold(w))) continue;
      total++;
      if (achados.length < limite) achados.push(w);
    }
  }

  achados.sort((a, b) => a.length - b.length || a.localeCompare(b, "pt-BR"));
  return { lido, achados, truncado: total > achados.length };
}
