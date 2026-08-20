/** Estações geodésicas do IBGE — a chapa de bronze cravada em ponte e calçada. */

/**
 * `[código, iMunicípio, tipo, situação, descrição, lat, lng, tema?, nome?,
 *   chapa?, localização?, itinerário?, altitude?]`
 *
 * As seis últimas entraram na Onda 5.1 e são OPCIONAIS de propósito: um arquivo
 * gerado antes dela continua carregando, e o `rotuloTipo` cai para o mapa por
 * letra. Base velha degrada; não quebra.
 */
export type LinhaEstacao = [
  codigo: string,
  iMunicipio: number,
  tipo: string,
  situacao: string,
  descricao: string,
  lat: number,
  lng: number,
  tema?: string,
  nome?: string,
  chapa?: string,
  localizacao?: string,
  itinerario?: string,
  altitude?: string,
];

/** Uma linha crua vira `Estacao`. Um lugar só, para as duas buscas. */
function linha(data: EstacoesData, r: LinhaEstacao): Estacao {
  const [cod, iMun, tipo, situacao, descricao, lat, lng, tema, nome, chapa, loc, itin, alt] = r;
  return {
    codigo: cod,
    municipio: data.municipios[iMun] ?? "",
    tipo,
    situacao,
    descricao,
    lat,
    lng,
    ...(tema ? { tema } : {}),
    ...(nome ? { nome } : {}),
    ...(chapa ? { chapa } : {}),
    ...(loc ? { localizacao: loc } : {}),
    ...(itin ? { itinerario: itin } : {}),
    ...(alt ? { altitude: alt } : {}),
  };
}

export interface EstacoesData {
  source: string;
  /** URL da API de origem, como o script a chamou. */
  url?: string;
  /**
   * Dia em que a cópia foi baixada do BDG.
   *
   * O `build:estacoes` **sempre gravou** este campo; a interface é que não o
   * declarava, então quem quisesse mostrá-lo no card não tinha como — e o dado
   * que envelhece em silêncio ficava sem data à vista.
   */
  generatedAt?: string;
  cobertura: string;
  count: number;
  municipios: string[];
  rows: LinhaEstacao[];
}

export interface Estacao {
  codigo: string;
  municipio: string;
  tipo: string;
  situacao: string;
  descricao: string;
  lat: number;
  lng: number;
  /** Onda 5.1 — o que o BDG dá e a base jogava fora. Ver `TEMA`. */
  tema?: string;
  nome?: string;
  chapa?: string;
  localizacao?: string;
  itinerario?: string;
  altitude?: string;
}

/** O que cada letra de tipo quer dizer no cadastro do IBGE. */
/**
 * O TEMA do BDG — e é ele que diz o que a estação é.
 *
 * A base guardava só o `tipoEstacao`, uma letra solta, e a bancada mostrava
 * `tipo E (não catalogado)` porque ninguém sabia o que a letra queria dizer. O
 * campo `tema` da API responde, e o mapa é direto — medido nas 491 estações do
 * Vale, com **zero** sem tema:
 *
 *   R → RN       232   ·   E → EG   226   ·   V → VT   14
 *   G → GPS       13   ·   P → EP     5   ·   D → DOPPLER  1
 */
const TEMA: Record<string, string> = {
  RN: "referência de nível (altimetria)",
  EG: "estação gravimétrica",
  VT: "vértice de triangulação (planimetria)",
  GPS: "estação GPS",
  DOPPLER: "estação Doppler (posicionamento por satélite, pré-GPS)",
};

/**
 * O mapa antigo, por LETRA. Fica como reserva para base velha — um arquivo
 * gerado antes da Onda 5.1 não tem a coluna `tema`, e cair no rótulo honesto é
 * melhor que quebrar.
 */
const TIPO: Record<string, string> = {
  R: "referência de nível (altitude)",
  V: "vértice (planimetria)",
  G: "estação GPS",
  M: "marégrafo",
};

/**
 * O rótulo do tipo — pelo TEMA quando ele existe, pela letra quando não.
 *
 * ── POR QUE ESTE RÓTULO EXISTE ─────────────────────────────────────────────
 * O `tipoEstacao` do BDG trazia três letras fora da tabela — `E` (226), `P` (5)
 * e `D` (1), 47,3% das 491 linhas —, e o card imprimia a letra crua no lugar de
 * um rótulo de verdade. Quem lê "R · BOM · Marco padrão" e depois "E · BOM ·
 * Pilar de concreto" supõe que o `E` significa algo que ele não sabe, quando
 * quem não sabia era a bancada. O campo `tema`, trazido no enriquecimento,
 * resolve as seis letras e não deixa nenhuma sem nome.
 *
 * `EP` fica sem nome de propósito: aparece em 5 estações do Vale, o chapa delas
 * começa com `EP-SG-22-…`, e não achamos fonte que fixe o que a sigla significa.
 * Mostrar a sigla do BDG é honesto; inventar "estação planimétrica" por
 * semelhança seria a mesma classe de erro que este rótulo existe para consertar.
 */
export const rotuloTipo = (t: string, tema?: string): string => {
  if (tema) return TEMA[tema] ?? `${tema} (sigla do BDG)`;
  const conhecido = TIPO[t];
  if (conhecido) return conhecido;
  return t ? `tipo ${t} (não catalogado)` : "tipo não informado";
};

/**
 * As estações mais PRÓXIMAS de um ponto — KNN linear sobre as 491 linhas.
 *
 * ── POR QUE LINEAR, E POR QUE SEM REDE ─────────────────────────────────────
 * São 491 pontos. Um índice espacial aqui custaria mais para manter do que a
 * varredura custa para rodar, e a varredura é local — não há requisição, não há
 * espera, não há degradação quando o backend cai. A distância é euclidiana com a
 * longitude pré-escalada por cos(27°), que é a mesma aproximação que o índice
 * GiST dos postes usa; a 90 km de raio o erro é irrelevante e a ORDEM, que é o
 * que importa aqui, não muda.
 *
 * ── PARA QUE SERVE NUMA PROVA ──────────────────────────────────────────────
 * A prova dá uma coordenada e pergunta o que há ali. A descrição de uma estação
 * geodésica costuma ser enunciado pronto — "chapa cravada na cabeceira da ponte
 * de concreto sobre o Rio Perequê" — e é o tipo de referência física que a
 * organização usa como âncora.
 */
export function proximas(
  data: EstacoesData | null,
  lat: number,
  lng: number,
  limite = 3,
): (Estacao & { km: number })[] {
  if (!data) return [];
  const escala = Math.cos((lat * Math.PI) / 180);
  const comDistancia = data.rows.map((r) => {
    const e = linha(data, r);
    const dy = e.lat - lat;
    const dx = (e.lng - lng) * escala;
    return { ...e, km: Math.sqrt(dy * dy + dx * dx) * 111.32 };
  });
  comDistancia.sort((a, b) => a.km - b.km);
  return comDistancia.slice(0, limite);
}

/**
 * ONDA 5.2 — busca pela INSCRIÇÃO DA CHAPA, a segunda entrada da estação.
 *
 * A prova dá o que está gravado no bronze, e nem sempre é o código: `MR-103`,
 * `RN-2053`, `EP-SG-22-1048`. Sem isto, esses textos caíam em `caesar-bruteforce`
 * a 0,40 — palpite, no lugar de um acerto exato numa base real.
 *
 * ── A RESSALVA É PARTE DO ITEM ─────────────────────────────────────────────
 * A cobertura é FINA: **57 das 491** estações do Vale têm `inscricaoChapa`
 * preenchida (11,6%). Isto acha o que existe e cala no resto — não é uma
 * segunda porta para a base inteira, e o card não pode sugerir que seja.
 */
export function porChapa(data: EstacoesData | null, chapa: string): Estacao[] {
  if (!data) return [];
  const alvo = chapa.trim().toUpperCase().replace(/[\s-]/g, "");
  if (alvo.length < 3) return [];
  return data.rows
    .filter((r) => (r[9] ?? "").toUpperCase().replace(/[\s-]/g, "") === alvo)
    .map((r) => linha(data, r));
}

export function porCodigo(data: EstacoesData | null, codigo: string): Estacao[] {
  if (!data) return [];
  const alvo = codigo.trim().toUpperCase();
  return data.rows.filter((r) => r[0] === alvo).map((r) => linha(data, r));
}
