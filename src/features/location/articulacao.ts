/**
 * ARTICULAÇÃO MUNICIPAL DE BLUMENAU — o desdobramento que a matemática não dá.
 *
 * ── ONDE A CARTA NACIONAL PARA ─────────────────────────────────────────────
 * `carta-ibge.ts` decompõe `SG-22-Z-B-VI-1-NE` sem consultar nada, porque cada
 * nível da articulação brasileira é uma divisão regular do anterior — e ela
 * termina em **1:25.000**. Abaixo disso a bancada calava, limpo.
 *
 * ── E POR QUE ABAIXO NÃO SE CALCULA ────────────────────────────────────────
 * O desdobramento municipal (1:5.000 e 1:1.000) foi ESCOLHIDO pela prefeitura.
 * Deduzir por semelhança produziria nomes plausíveis e errados, que é o pior
 * resultado possível — a única fonte é a articulação publicada.
 */

export interface ArticulacaoData {
  source: string;
  url: string;
  generatedAt: string;
  /** Denominador da escala → folhas. */
  escalas: Record<string, [string, number, number, number, number][]>;
}

export interface FolhaHit {
  /** Nomenclatura da folha, como publicada. */
  folha: string;
  /** Denominador da escala: 5000 ou 1000. */
  escala: number;
  /** Centro da quadrícula. */
  lat: number;
  lng: number;
  /** Lados em graus [lat, lon] — para a tela dizer o tamanho da folha. */
  size: [number, number];
  /** A data em que a articulação foi baixada; ela envelhece em silêncio. */
  geradoEm: string;
}

const normaliza = (s: string) => s.trim().toUpperCase().replace(/\s+/g, "");

/**
 * Nome da folha → centro da quadrícula.
 *
 * Casamento EXATO contra a articulação publicada: fora dela, `null`. É esse
 * "não reconheci" que separa o dado da dedução — ver o cabeçalho.
 */
export function buscarFolha(data: ArticulacaoData | null, raw: string): FolhaHit | null {
  if (!data) return null;
  const alvo = normaliza(raw);
  if (!alvo) return null;

  for (const [escalaStr, folhas] of Object.entries(data.escalas)) {
    for (const [nome, minLon, minLat, maxLon, maxLat] of folhas) {
      if (normaliza(nome) !== alvo) continue;
      return {
        folha: nome,
        escala: Number(escalaStr),
        lat: (minLat + maxLat) / 2,
        lng: (minLon + maxLon) / 2,
        size: [maxLat - minLat, maxLon - minLon],
        geradoEm: data.generatedAt,
      };
    }
  }
  return null;
}

/**
 * Forma de uma folha municipal — o portão barato, antes de varrer 1.031 nomes.
 *
 * Ela estende a nomenclatura nacional, então começa igual (`SG-22-Z-…`) e vai
 * mais fundo. O portão não decide nada: quem decide é o casamento exato.
 */
export const PARECE_FOLHA = /^[NS]?[A-V]-\d{1,2}(?:-[A-Z0-9IV]+){4,}$/i;
