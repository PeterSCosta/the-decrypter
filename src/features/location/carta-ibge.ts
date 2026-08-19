/**
 * Índice de nomenclatura da carta topográfica IBGE/DSG (articulação sistemática
 * da CIM, a Carta Internacional ao Milionésimo).
 *
 * `SG-22-Z-B-IV-4-SE` se lê da esquerda para a direita, cada pedaço partindo o
 * anterior:
 *  - `SG`   hemisfério Sul + faixa de 4° de latitude (A = 0–4°, G = 24–28°);
 *  - `22`   fuso de 6° de longitude, o mesmo número da UTM (-54° a -48°);
 *  - `Z`    1:500.000 — V/X/Y/Z = NO/NE/SO/SE;
 *  - `B`    1:250.000 — A/B/C/D = NO/NE/SO/SE;
 *  - `IV`   1:100.000 — I..VI em 3 colunas × 2 linhas, da esquerda p/ a direita
 *           e de cima para baixo (inverter aqui erra 30');
 *  - `4`    1:50.000  — 1/2/3/4 = NO/NE/SO/SE;
 *  - `SE`   1:25.000  — NO/NE/SO/SE.
 *
 * Devolve o CENTRO da quadrícula, com o denominador da escala junto: o código
 * nomeia uma FOLHA, não um ponto, e a folha vai de 4°×6° (~440 km) a 7,5'×7,5'
 * (~14 km) conforme quantos níveis vierem.
 *
 * Conferido ao contrário contra registro real do acervo IBGE: Mafra/SC
 * (-26.1114, -49.8054) sai 'SG-22-Z-A-III-1', a nomenclatura publicada da folha
 * "MAFRA SG-22-Z-A-III-1 MI 2868-1"; e 'SG-22-Z-B' é a folha 1:250.000 Blumenau.
 *
 * ── O NÍVEL DA CIM (1:1.000.000) ────────────────────────────────────────────
 * A ficha da aba e a Ajuda anunciam "de 1:1.000.000 (SG-22) até a quadrícula de
 * 7,5'", mas `SG-22` sozinho voltava "não reconheci": a regex exigia o grupo
 * `([VXYZ])` e a tabela de escalas começava em 500.000. Prometido e recusado.
 *
 * O nível existe: `SG-22` é a folha CIM Curitiba, 4°×6° com centro em
 * -26,0 / -51,0. O que segurava o gate era o medo de casar com rótulo genérico:
 * `B-12` e `A-4` também são "letra-hífen-número". E o medo tinha razão. A
 * primeira tentativa aqui foi só exigir o hemisfério explícito, e ela NÃO
 * basta: numa bateria de 900 strings de ruído brasileiro deu 59 falsos
 * positivos — `NF-12` (nota fiscal) virava faixa 20–24°N no fuso 12, e
 * `NR-10`/`NR-18` (as normas regulamentadoras, que todo documento de obra cita)
 * viravam faixa 68–72°N.
 *
 * Então, SEM nenhum nível de subdivisão, valem as três exigências juntas:
 *  1. hemisfério explícito (`SG-22` sim, `G-22` não);
 *  2. faixa de latitude que o Brasil toca — NA/NB ao norte (Monte Caburaí,
 *     +5°16') e SA..SI ao sul (Arroio Chuí, -33°45');
 *  3. fuso de 18 a 26 — 18 pega a Serra do Divisor (-73°59'), 25 pega a Ponta
 *     do Seixas (-34°47') e 26 entra por causa de Trindade e Martim Vaz
 *     (~-29°) e do arquipélago de São Pedro e São Paulo.
 *
 * Medido depois da correção: 0 falsos positivos em 1.200 strings de ruído, e na
 * varredura do pior caso — TODA sigla "XX-nn" com X em N/S, 5.148 rótulos —
 * passam exatamente 99, que são as 11 faixas × 9 fusos da janela. As 99 folhas
 * da CIM da janela continuam todas reconhecidas.
 *
 * Por que a janela e não a lista fechada das folhas: o número publicado é "46
 * folhas ao milionésimo cobrindo o Brasil", mas 46 é a contagem DEPOIS de
 * encartar pedaços de território e ilhas mais distantes em folhas vizinhas.
 * Fixar essas 46 recusaria nomenclatura legítima do próprio acervo, então
 * preferimos a janela — ela não afirma que a folha foi mapeada, só que o código
 * está dentro da articulação do país.
 *
 * Resíduo assumido: `SC-22` e `SE-22` também são siglas de UF. Não colidem na
 * prática porque rodovia estadual leva três dígitos (SC-108, SC-470, SE-100) e
 * aqui o fuso aceita no máximo dois.
 *
 * Com pelo menos o 1:500.000 no código nada disso se aplica: o hemisfério segue
 * opcional e o fuso vale 1..60 como antes, porque aí a cadeia de vocabulários
 * fechados já sustenta o gate sozinha (comportamento inalterado).
 *
 * ── OS SEPARADORES ──────────────────────────────────────────────────────────
 * Antes só o hífen separava (a normalização apagava espaço, e a regex pedia `-`
 * literal). Código copiado de legenda de carta escaneada, de OCR ou de planilha
 * vem com ponto, espaço, barra ou sublinhado — e os arquivos do FTP do IBGE
 * usam `_`. Agora qualquer corrida de ` . _ / -` vira um hífen só.
 *
 * O risco de falso positivo é baixo PORQUE o gate não é a pontuação: é uma
 * sequência de vocabulários fechados encadeados e ancorada nas duas pontas
 * (hemisfério N/S · faixa A–V · fuso 1–60 · V/X/Y/Z · A–D · I–VI · 1–4 ·
 * NO/NE/SO/SE). Afrouxar o separador não abre vaga nova: o que decide é a
 * cadeia. Conferido contra o mesmo lote de ruído do teste — CEP, CPF, telefone,
 * data e coordenada decimal seguem em `null` depois da troca, porque nenhum
 * deles começa com faixa+fuso.
 *
 * ── O NÚMERO MI (Mapa Índice) — RECONHECE, NÃO CONVERTE ─────────────────────
 * A ficha da aba chama este formato de "Carta IBGE/DSG (articulação MI)", mas o
 * MI não era lido. Ele é como o acervo do IBGE e o material impresso identificam
 * a folha: "MAFRA SG-22-Z-A-III-1 MI 2868-1".
 *
 * O que a pesquisa FECHOU (11 pares de acervo, nomenclatura ↔ MI):
 *  - o MI numera as folhas 1:100.000 sequencialmente (a faixa publicada é
 *    1..3.036; há fonte citando 3.049), de oeste para leste e de norte para sul,
 *    e a contagem atravessa as folhas da CIM: SD-22-Z-D-VI = MI 2214 e
 *    SD-23-Y-C-IV = MI 2215 são vizinhas de lado na mesma linha de 30';
 *  - os sufixos do MI são LITERALMENTE os da nomenclatura. Em 6 pares
 *    (2868-1/…-III-1, 2882-3/…-V-3, 2909-4/…-V-4, 2735-1, 2813-3, 2644-1) o
 *    dígito do 1:50.000 se repete, e em SD-22-Z-D-VI-2-NE = MI 2214-2-NE o
 *    quadrante do 1:25.000 também. Ou seja: só o número da folha 1:100.000 é
 *    que carrega informação nova.
 *
 * O que a pesquisa NÃO ACHOU, e por isso aqui não se converte: a regra de
 * conversão entre o número MI e a nomenclatura não está publicada. Ela não é
 * fórmula — o Mapa Índice Digital do IBGE guarda `indNomenclatura` e `mi` como
 * DUAS colunas separadas por folha, e a documentação técnica (4ª ed. 2011 /
 * 5ª ed. 2021) não traz nenhuma regra de passagem. A conta também não fecha
 * sozinha: SG-22-Z-A-III (2868) → SG-22-Z-B-V (2882) é +14 para "uma linha ao
 * sul, duas colunas a leste", o que pediria linha de 12 folhas; mas
 * SG-22-Z-B-V (2882) → SG-22-Z-D-V (2909) é +27 para "duas linhas ao sul, mesma
 * coluna", o que pede ~13,5. Ou seja: a linha não tem comprimento fixo. A
 * hipótese (não conferida contra fonte) é que ela acompanhe o contorno do país,
 * que se alarga para oeste à medida que se desce para o Rio Grande do Sul. Seja
 * qual for a explicação, reproduzir a numeração exigiria a fronteira nacional
 * recortada de 30' em 30' — que é a tabela de 3.036 folhas, e ela não cabe aqui.
 *
 * Então `decodeMiSheet` entrega RECONHECIMENTO, não coordenada: diz que aquilo
 * é um número MI, qual escala o sufixo implica e que a bancada não converte. Um
 * MI convertido no chute seria resposta errada com cara de certa — o pior
 * defeito que esta bancada pode ter, porque o usuário não tem como conferir.
 *
 * Ressalva honesta que fica no reconhecimento: o número puro NÃO fixa a escala.
 * O acervo também numera as folhas 1:250.000 com MI ("SERRA DOS CARAJÁS
 * SB-22-Z-A MI 198", "SERRA DO RONCADOR SC-22-Y-D MI 322"), numa série própria
 * que vai até ~556. Abaixo desse teto devolvemos as duas escalas possíveis em
 * vez de escolher uma.
 */
import type { GeoPoint } from "./formats";

/**
 * Normalização de entrada. Qualquer corrida de espaço, ponto, sublinhado, barra
 * ou hífen vira um hífen só, e as pontas ficam limpas. Ver o bloco "OS
 * SEPARADORES" no topo para por que isso não afrouxa o gate.
 */
const normalizar = (raw: string): string =>
  raw
    .trim()
    .toUpperCase()
    .replace(/[\s._/-]+/g, "-")
    .replace(/^-+|-+$/g, "");

/**
 * Gate. A sequência de vocabulários fechados torna o falso positivo quase
 * impossível. O grupo do 1:500.000 é opcional para que a folha da CIM
 * (`SG-22`, 4°×6°) resolva — mas ver a checagem logo abaixo do match: parando
 * no fuso, a regex sozinha é fraca demais ("B-12", "NF-12", "NR-18" têm a mesma
 * forma) e entra a janela brasileira.
 */
const CARTA_RE =
  /^([NS])?([A-V])-(\d{1,2})(?:-([VXYZ])(?:-([A-D])(?:-(I{1,3}|IV|VI?)(?:-([1-4])(?:-(NO|NE|SO|SE))?)?)?)?)?$/;

/** Denominador da escala por nível preenchido. */
const SCALES = [1_000_000, 500_000, 250_000, 100_000, 50_000, 25_000];

/**
 * Janela da articulação brasileira, usada SÓ quando o código para no fuso (ver
 * "O NÍVEL DA CIM" no topo). Faixas: NA/NB ao norte, SA..SI ao sul. Fusos: 18
 * (Serra do Divisor) a 26 (Trindade / São Pedro e São Paulo).
 */
const CIM_BR_BANDS = { N: "AB", S: "ABCDEFGHI" } as const;
const CIM_BR_ZONE_MIN = 18;
const CIM_BR_ZONE_MAX = 26;

export interface CartaHit extends GeoPoint {
  /** Escala da folha (denominador): 1000000 … 25000. */
  scale: number;
  /** Nomenclatura normalizada, com o hemisfério explícito. */
  sheet: string;
  /** Lados da quadrícula em graus [lat, lon]. */
  size: [number, number];
}

/** Um retângulo em graus, encolhido nível a nível. */
interface Quad {
  latN: number;
  latS: number;
  lonW: number;
  lonE: number;
}

/** Parte o retângulo em 2×2 e devolve o quadrante pedido. */
function quarter(q: Quad, east: boolean, south: boolean): Quad {
  const latMid = (q.latN + q.latS) / 2;
  const lonMid = (q.lonW + q.lonE) / 2;
  return {
    latN: south ? latMid : q.latN,
    latS: south ? q.latS : latMid,
    lonW: east ? lonMid : q.lonW,
    lonE: east ? q.lonE : lonMid,
  };
}

const ROMAN = ["I", "II", "III", "IV", "V", "VI"];

/** Nomenclatura da folha → centro da quadrícula. `null` quando não é um código. */
export function decodeCartaIbge(raw: string): CartaHit | null {
  const s = normalizar(raw);
  const m = s.match(CARTA_RE);
  if (!m) return null;

  // Cartas antigas às vezes omitem o S/N. Dentro do Brasil, assume-se Sul.
  const south = m[1] !== "N";
  const bandIdx = m[2].charCodeAt(0) - 65; // A = 0–4°, B = 4–8°, …
  const zone = Number(m[3]);
  if (zone < 1 || zone > 60) return null;
  if (bandIdx * 4 + 4 > 88) return null;

  // Parando no fuso não há cadeia para segurar o gate: "NF-12" e "NR-18" têm a
  // mesma forma. Aí exige-se hemisfério explícito + janela brasileira. Ver "O
  // NÍVEL DA CIM" no topo para os 59 falsos positivos medidos sem isso.
  if (!m[4]) {
    if (!m[1]) return null;
    if (!CIM_BR_BANDS[m[1] as "N" | "S"].includes(m[2])) return null;
    if (zone < CIM_BR_ZONE_MIN || zone > CIM_BR_ZONE_MAX) return null;
  }

  // Folha 1:1.000.000: 4° de latitude × 6° de longitude (o fuso da UTM).
  const latFar = bandIdx * 4 + 4; // borda mais distante do equador
  let q: Quad = {
    latN: south ? -(latFar - 4) : latFar,
    latS: south ? -latFar : latFar - 4,
    lonW: (zone - 1) * 6 - 180,
    lonE: zone * 6 - 180,
  };
  let level = 0;

  // 1:500.000 — V NO, X NE, Y SO, Z SE
  if (m[4]) {
    const v = m[4];
    q = quarter(q, v === "X" || v === "Z", v === "Y" || v === "Z");
    level = 1;
  }

  // 1:250.000 — A NO, B NE, C SO, D SE
  if (m[5]) {
    const c = m[5];
    q = quarter(q, c === "B" || c === "D", c === "C" || c === "D");
    level = 2;
  }

  // 1:100.000 — 3 colunas × 2 linhas, I..VI
  if (m[6]) {
    const n = ROMAN.indexOf(m[6]);
    if (n < 0) return null;
    const col = n % 3;
    const row = Math.floor(n / 3);
    const lonStep = (q.lonE - q.lonW) / 3;
    const latStep = (q.latN - q.latS) / 2;
    q = {
      lonW: q.lonW + col * lonStep,
      lonE: q.lonW + (col + 1) * lonStep,
      latN: q.latN - row * latStep,
      latS: q.latN - (row + 1) * latStep,
    };
    level = 3;
  }

  // 1:50.000 — 1 NO, 2 NE, 3 SO, 4 SE
  if (m[7]) {
    const d = Number(m[7]);
    q = quarter(q, d === 2 || d === 4, d === 3 || d === 4);
    level = 4;
  }

  // 1:25.000 — NO/NE/SO/SE
  if (m[8]) {
    const d = m[8];
    q = quarter(q, d === "NE" || d === "SE", d === "SO" || d === "SE");
    level = 5;
  }

  const lat = (q.latN + q.latS) / 2;
  const lng = (q.lonW + q.lonE) / 2;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return {
    lat,
    lng,
    scale: SCALES[level],
    // Sem hemisfério explícito, o "S" assumido entra na nomenclatura devolvida.
    sheet: m[1] ? s : `S${s}`,
    size: [q.latN - q.latS, q.lonE - q.lonW],
  };
}

export const parseCartaIbge = (raw: string): GeoPoint | null => {
  const hit = decodeCartaIbge(raw);
  return hit ? { lat: hit.lat, lng: hit.lng } : null;
};

// ---- Número MI (Mapa Índice) ---------------------------------------------

/**
 * Gate do MI. O `MI` literal é a ASSINATURA: "2868-1" sozinho não é nada — bate
 * com ano-mês, com lote, com placar. Sem o prefixo, não emite.
 */
const MI_RE = /^MI-?(\d{1,4})(?:-([1-4])(?:-(NO|NE|SO|SE))?)?$/;

/**
 * Teto do número. A faixa clássica do MI 1:100.000 é 1..3.036; outra fonte cita
 * 3.049 folhas. Ficamos com o teto maior de propósito: a saída aqui é só
 * "isto é um MI", nunca uma coordenada, então recusar um número que existe
 * custa mais do que aceitar um que não existe.
 */
const MI_MAX = 3049;

/**
 * Teto da série 1:250.000, que também recebe MI no acervo (MI 198 = SB-22-Z-A).
 * Abaixo dele o número puro é ambíguo entre as duas escalas.
 */
const MI_250K_MAX = 556;

export interface MiHit {
  /** Número da folha no Mapa Índice. */
  mi: number;
  /** Sufixo do 1:50.000 (1 NO, 2 NE, 3 SO, 4 SE), quando veio. */
  sub50?: number;
  /** Sufixo do 1:25.000 (NO/NE/SO/SE), quando veio. */
  sub25?: string;
  /** Forma canônica: "MI 2868-1". */
  label: string;
  /**
   * Escalas possíveis. Só o SUFIXO fecha a escala; o número puro pode ser da
   * série 1:250.000 ou da 1:100.000 enquanto couber nas duas.
   */
  scales: number[];
}

/**
 * Por que a bancada para no reconhecimento. Texto pronto para a interface — a
 * justificativa completa está no cabeçalho deste arquivo.
 */
export const MI_SEM_CONVERSAO =
  "Número do Mapa Índice do IBGE/DSG. A bancada reconhece o formato, mas não " +
  "converte em coordenada: a correspondência entre o MI e a nomenclatura da " +
  "carta é uma tabela de ~3.036 folhas, não uma fórmula — o próprio Mapa " +
  "Índice Digital guarda os dois como colunas separadas. Procure a folha pela " +
  "nomenclatura (ex.: SG-22-Z-A-III-1), que essa a bancada resolve.";

/**
 * "MI 2868-1", "MI-2868-2-NO", "MI2868" → o que dá para afirmar sobre a folha.
 * `null` quando não é um número MI. NUNCA devolve coordenada: ver o cabeçalho.
 */
export function decodeMiSheet(raw: string): MiHit | null {
  const m = normalizar(raw).match(MI_RE);
  if (!m) return null;

  const mi = Number(m[1]);
  if (mi < 1 || mi > MI_MAX) return null;

  const sub50 = m[2] ? Number(m[2]) : undefined;
  const sub25 = m[3];

  // Os sufixos do MI são os mesmos da nomenclatura (conferido em 6 pares do
  // acervo), então eles fecham a escala sozinhos.
  const scales = sub25
    ? [25_000]
    : sub50
      ? [50_000]
      : mi <= MI_250K_MAX
        ? [250_000, 100_000]
        : [100_000];

  const label = ["MI", ` ${mi}`, sub50 ? `-${sub50}` : "", sub25 ? `-${sub25}` : ""].join("");
  return { mi, sub50, sub25, label, scales };
}

/**
 * "1:25.000" — ponto de milhar do pt-BR. Formatado à mão em vez de
 * `toLocaleString`, que depende do ICU do ambiente e mudaria o texto no teste.
 */
export const cartaScaleLabel = (scale: number): string =>
  `1:${String(scale).replace(/\B(?=(\d{3})+$)/g, ".")}`;
