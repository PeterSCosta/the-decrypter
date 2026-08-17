import type { BridgeRow } from "./types";

/**
 * Casamento de nome de ponte — a mesma regra que a Triangulação já usava,
 * extraída para os dois lados a compartilharem.
 *
 * Estava enterrada em `triangulate/resolve.ts` como `achaPonte`, e o decoder
 * precisava exatamente dela. Duas cópias da regra é como elas divergem: a
 * Triangulação aceitaria um apelido que o Decodificador recusa, e a mesma
 * entrada daria respostas diferentes em duas abas da mesma bancada.
 */

/**
 * Maiúsculas sem acento, só letras/dígitos/espaço.
 *
 * A remoção explícita das marcas de combinação **corrige** o que a versão da
 * Triangulação fazia: ela ia direto ao `[^A-Z0-9 ]`, que troca a marca por
 * espaço — "São" virava "SA O", e quem digitasse "ponte sao francisco" não
 * casava com a ponte acentuada da base.
 */
export function normaliza(s: string): string {
  return (
    s
      .normalize("NFD")
      // `\p{Mn}` (nonspacing mark) é o que o NFD produz, e diz o que faz melhor
      // que o intervalo \u0300-\u036f — que o Biome ainda acusa de classe enganosa.
      .replace(/\p{Mn}/gu, "")
      .toUpperCase()
      .replace(/[^A-Z0-9 ]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

/**
 * Só consulta quando a entrada **diz** que é uma estrutura.
 *
 * O gate é o mesmo de `resolve.ts:142`, e existe pela razão que o
 * `PLANO-CIFRAS.md` deu para não fazer decoder de plaqueta: um decoder que
 * chuta pela forma vira ruído. "Kern" sozinho é sobrenome, nome de rua e
 * palavra solta; "Passarela Rodolpho Kern" é uma afirmação.
 */
export const PARECE_ESTRUTURA = /\b(ponte|passarela|viaduto|pontilh[ãa]o)\b/i;

export interface AcertoDePonte {
  ponte: BridgeRow;
  /** `exato` quando a entrada é o nome inteiro; `contido` quando é parte dele. */
  forca: "exato" | "contido";
}

/**
 * Acha a ponte cujo nome (oficial, do OSM ou apelido) casa com o texto.
 *
 * Devolve também a força do acerto, que o decoder converte em confiança: casar
 * o nome inteiro é uma coisa, casar "ponte" — que está em 60 das 94 linhas — é
 * outra bem diferente.
 */
export function achaPonte(
  alvo: string,
  rows: BridgeRow[],
  /**
   * A Triangulação precisa de coordenada: uma ponte que só existe na lei não
   * serve de vértice. O Decodificador aceita, porque ali a lei é a resposta.
   */
  opts: { exigirGeo?: boolean } = {},
): AcertoDePonte | null {
  const q = normaliza(alvo);
  if (q.length < 4) return null;
  const base = opts.exigirGeo ? rows.filter((r) => r.lat != null && r.lng != null) : rows;

  let exato: BridgeRow | null = null;
  const contidos: BridgeRow[] = [];

  for (const r of base) {
    const nomes = [r.nome, r.nomeOsm ?? "", ...r.apelidos].filter(Boolean).map(normaliza);
    if (nomes.some((n) => n === q)) {
      // Empate no exato: o de nome mais curto (mais específico) ganha.
      if (!exato || r.nome.length < exato.nome.length) exato = r;
    } else if (nomes.some((n) => n.includes(q))) {
      contidos.push(r);
    }
  }

  if (exato) return { ponte: exato, forca: "exato" };
  if (!contidos.length) return null;

  // "ponte de ferro" casa com muita coisa; o nome mais curto é o mais
  // específico. Com geometria vem antes de sem: a linha do OSM é a que sabe
  // onde a estrutura está, e é o que a pessoa quase sempre quer ver.
  contidos.sort((a, b) => {
    const geo = Number(b.lat != null) - Number(a.lat != null);
    return geo !== 0 ? geo : a.nome.length - b.nome.length;
  });
  return { ponte: contidos[0], forca: "contido" };
}
