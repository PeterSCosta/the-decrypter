/**
 * Coleta os postes de iluminação pública de Blumenau (plaqueta + coordenada +
 * endereço) a partir do portal público **Cidade Iluminada** (Exati/IPBL).
 *
 * Como funciona: o mapa do portal usa o comando `ConsultarPontosProximos`, que
 * devolve **os 20 pontos mais próximos** de uma coordenada — sem login e sem
 * captcha (`USAR_CAPTCHA: 0` na config de Blumenau). Não existe endpoint de
 * bulk, então varremos o município com **cobertura por união de discos**:
 *
 *   consulta em (lat,lng) → d20 = distância do 20º ponto devolvido. Como o
 *   backend ordena por distância, sabemos que conhecemos TODOS os postes até o
 *   raio d20 — isto é, aquele disco está *provado* varrido. Marcamos o disco
 *   num raster de cobertura e pulamos para o próximo pixel ainda descoberto.
 *
 * Isso dá cobertura completa (não é amostragem), não só amostra: o laço só
 * termina quando não sobra pixel descoberto dentro da bbox. Em área vazia os 20
 * vizinhos ficam a quilômetros, o disco é enorme e uma única consulta liquida
 * dezenas de km² — a varredura se auto-poda fora da malha urbana.
 *
 * A `DISTANCIA` da API é euclidiana **em graus** (verificado contra as
 * coordenadas devolvidas), então toda a geometria aqui vive em graus — sem
 * conversão para metros, sem erro de projeção. O raio marcado é descontado da
 * meia-diagonal do pixel, senão marcaríamos como coberto um pixel cuja quina
 * cai fora do disco certificado.
 *
 * É reexecutável e retomável: os discos já certificados ficam em
 * `data-sources/postes-state.json` (o raster é reconstruído a partir deles) e
 * cada poste bruto é anexado em `data-sources/postes-raw.jsonl`. Matar o
 * processo e rodar de novo continua de onde parou.
 *
 * Uso:
 *   pnpm build:postes                 # varredura completa (educada, ~3 req/s)
 *   MAX_QUERIES=400 pnpm build:postes # piloto limitado
 *   DELAY_MS=500 pnpm build:postes    # mais devagar ainda
 *   BBOX=-27.11,-26.69,-49.32,-48.95  # latMin,latMax,lngMin,lngMax
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const RAW = resolve(ROOT, "data-sources/postes-raw.jsonl");
const STATE = resolve(ROOT, "data-sources/postes-state.json");
const OUT = resolve(ROOT, "public/data/postes.json");

const API = "https://ipbl.exati.com.br/guia/command/ipbl";
const ID_PARQUE_SERVICO = 1; // Blumenau, conforme ConsultarConfiguracoesVisuais
const PAGE_LIMIT = 20; // teto fixo do backend — não há parâmetro para aumentar

/** Município inteiro com folga; área vazia se auto-poda no primeiro disco. */
const BBOX_PADRAO = { latMin: -27.11, latMax: -26.69, lngMin: -49.32, lngMax: -48.95 };

const DELAY_MS = Number(process.env.DELAY_MS ?? 300); // ~3 req/s, uma conexão só
const MAX_QUERIES = Number(process.env.MAX_QUERIES ?? Number.POSITIVE_INFINITY);
const TENTATIVAS = Number(process.env.TENTATIVAS ?? 8); // até ~4 min de espera total
const PASSO = 5e-5; // ~5,5 m — resolução do raster de cobertura
const MARGEM = 0.98; // desconto no raio (empates cortados pelo LIMIT do backend)
const CHECKPOINT_A_CADA = 50;

/** Os 21 campos que `ConsultarPontosProximos` devolve. Guardamos todos. */
type Ponto = {
  ID_PONTO_SERVICO: number;
  NUMERO_IDENTIFICACAO?: string;
  LATITUDE_TOTAL: string;
  LONGITUDE_TOTAL: string;
  DISTANCIA: string;
  GEOMETRIA?: string;
  PONTOS?: string;
  TIPO_GEOMETRIA?: string;
  ENDERECO?: string;
  NOME_LOGRADOURO_COMPLETO?: string;
  NOME_LOGRADOURO?: string;
  DESC_TIPO_LOGRADOURO?: string;
  ID_LOGRADOURO?: number | string;
  NUMERO_LOCAL_INICIAL?: number | string;
  DESC_STATUS_PONTO_SERVICO?: string;
  DESC_TIPO_PONTO_SERVICO?: string;
  ID_TIPO_PONTO_SERVICO?: number | string;
  ID_ESTRUTURA_PS?: number | string;
  NOME_PARQUE_SERVICO?: string;
  ALTURA?: string;
  COR?: number | string;
};

/** Disco provado varrido: todo poste a até `r` graus de (lat,lng) já é conhecido. */
type Disco = [lat: number, lng: number, r: number];

type Estado = {
  bbox: typeof BBOX_PADRAO;
  discos: Disco[];
  cursor: number;
  saturados: number;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function parseBbox(): typeof BBOX_PADRAO {
  const raw = process.env.BBOX;
  if (!raw) return BBOX_PADRAO;
  const [latMin, latMax, lngMin, lngMax] = raw.split(",").map(Number);
  if ([latMin, latMax, lngMin, lngMax].some(Number.isNaN)) {
    throw new Error("BBOX inválida — use latMin,latMax,lngMin,lngMax");
  }
  return { latMin, latMax, lngMin, lngMax };
}

async function consultarPontosProximos(lat: number, lng: number): Promise<Ponto[]> {
  const body = new URLSearchParams({
    "CMD.COMMAND": "ConsultarPontosProximos",
    "CMD.COORDENADA_X": String(lng), // X = longitude
    "CMD.COORDENADA_Y": String(lat), // Y = latitude
    "CMD.ID_PARQUE_SERVICO": String(ID_PARQUE_SERVICO),
    "CMD.IS_CIDADE_ILUMINADA": "1",
    parser: "json",
  });

  for (let tentativa = 1; ; tentativa++) {
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as {
        RAIZ?: { PONTOS_SERVICOS?: { PONTO_SERVICO?: Ponto | Ponto[] } };
      };
      const p = json.RAIZ?.PONTOS_SERVICOS?.PONTO_SERVICO;
      if (!p) return [];
      return Array.isArray(p) ? p : [p];
    } catch (err) {
      if (tentativa >= TENTATIVAS) throw err;
      // A instância da Exati cai sozinha de vez em quando (503 em várias
      // cidades ao mesmo tempo). Espera longa: é a casa deles, não a nossa.
      const espera = Math.min(60_000, 2000 * 2 ** (tentativa - 1));
      console.warn(
        `  ! ${String(err)} — tentativa ${tentativa}/${TENTATIVAS}, aguardando ${espera / 1000}s`,
      );
      await sleep(espera);
    }
  }
}

/**
 * Raster de cobertura: 1 byte por pixel de PASSO×PASSO graus dentro da bbox.
 * Não guardamos o raster em disco — ele é reconstruído replicando os discos.
 */
class Cobertura {
  readonly nLat: number;
  readonly nLng: number;
  private readonly px: Uint8Array;
  /** Meia-diagonal do pixel: o quanto encolher o raio para o pixel caber inteiro. */
  private readonly folga = Math.hypot(PASSO, PASSO) / 2;

  constructor(private readonly bbox: typeof BBOX_PADRAO) {
    this.nLat = Math.ceil((bbox.latMax - bbox.latMin) / PASSO);
    this.nLng = Math.ceil((bbox.lngMax - bbox.lngMin) / PASSO);
    this.px = new Uint8Array(this.nLat * this.nLng);
  }

  get total(): number {
    return this.nLat * this.nLng;
  }

  coberto(idx: number): boolean {
    return this.px[idx] === 1;
  }

  /** Índice do pixel que contém a coordenada (−1 se cair fora da bbox). */
  indice(lat: number, lng: number): number {
    const i = Math.floor((lat - this.bbox.latMin) / PASSO);
    const j = Math.floor((lng - this.bbox.lngMin) / PASSO);
    if (i < 0 || j < 0 || i >= this.nLat || j >= this.nLng) return -1;
    return i * this.nLng + j;
  }

  /** Centro do pixel, em graus. */
  centro(idx: number): [lat: number, lng: number] {
    const i = Math.floor(idx / this.nLng);
    const j = idx % this.nLng;
    return [this.bbox.latMin + (i + 0.5) * PASSO, this.bbox.lngMin + (j + 0.5) * PASSO];
  }

  /**
   * Marca o disco certificado. Devolve `false` quando o raio é menor que a
   * própria folga do pixel (mais de 20 postes num raio de metros) — aí só o
   * pixel corrente é marcado, para o laço não travar.
   */
  marcar(lat: number, lng: number, raio: number, idxCorrente: number): boolean {
    const efetivo = raio === Number.POSITIVE_INFINITY ? raio : raio - this.folga;
    if (!(efetivo > 0)) {
      if (idxCorrente >= 0) this.px[idxCorrente] = 1;
      return false;
    }
    const i0 = Math.max(0, Math.floor((lat - efetivo - this.bbox.latMin) / PASSO));
    const i1 = Math.min(this.nLat - 1, Math.ceil((lat + efetivo - this.bbox.latMin) / PASSO));
    const j0 = Math.max(0, Math.floor((lng - efetivo - this.bbox.lngMin) / PASSO));
    const j1 = Math.min(this.nLng - 1, Math.ceil((lng + efetivo - this.bbox.lngMin) / PASSO));
    const r2 = efetivo * efetivo;
    for (let i = i0; i <= i1; i++) {
      const dLat = this.bbox.latMin + (i + 0.5) * PASSO - lat;
      const resto = r2 - dLat * dLat;
      if (resto < 0) continue;
      const meia = Math.sqrt(resto);
      const ja = Math.max(j0, Math.ceil((lng - meia - this.bbox.lngMin) / PASSO - 0.5));
      const jb = Math.min(j1, Math.floor((lng + meia - this.bbox.lngMin) / PASSO - 0.5));
      this.px.fill(1, i * this.nLng + ja, i * this.nLng + jb + 1);
    }
    return true;
  }
}

function carregarEstado(): Estado {
  if (existsSync(STATE)) return JSON.parse(readFileSync(STATE, "utf8")) as Estado;
  return { bbox: parseBbox(), discos: [], cursor: 0, saturados: 0 };
}

function carregarPostes(): Map<number, Ponto> {
  const mapa = new Map<number, Ponto>();
  if (!existsSync(RAW)) return mapa;
  for (const linha of readFileSync(RAW, "utf8").split("\n")) {
    if (!linha.trim()) continue;
    const p = JSON.parse(linha) as Ponto;
    mapa.set(Number(p.ID_PONTO_SERVICO), p);
  }
  return mapa;
}

/**
 * Exporta **todos** os campos que a API devolve, só renomeados e com os
 * numéricos convertidos. O único descartado é `DISTANCIA`: ela mede a distância
 * até o ponto de consulta que por acaso achou o poste, não é propriedade do
 * poste — guardá-la seria guardar lixo com cara de dado.
 *
 * Sobre o endereço: `ENDERECO` só vem em 18% dos registros e
 * `NOME_LOGRADOURO_COMPLETO` em 100%, então a rua sai do segundo; os campos
 * separados (tipo/nome/id do logradouro, 82%) vão junto, que é o formato que
 * casa com `streets.json`.
 */
function exportar(postes: Map<number, Ponto>, estado: Estado, completo: boolean): void {
  const num = (v: unknown): number | null =>
    v === undefined || v === null || v === "" ? null : Number(v);

  const rows = [...postes.values()]
    .map((p) => ({
      id: Number(p.ID_PONTO_SERVICO),
      plaqueta: p.NUMERO_IDENTIFICACAO ?? null,
      lat: Number(p.LATITUDE_TOTAL),
      lng: Number(p.LONGITUDE_TOTAL),
      rua: p.NOME_LOGRADOURO_COMPLETO ?? p.ENDERECO ?? null,
      ruaTipo: p.DESC_TIPO_LOGRADOURO ?? null,
      ruaNome: p.NOME_LOGRADOURO ?? null,
      ruaId: num(p.ID_LOGRADOURO),
      endereco: p.ENDERECO ?? null,
      numero: num(p.NUMERO_LOCAL_INICIAL),
      tipo: p.DESC_TIPO_PONTO_SERVICO ?? null,
      tipoId: num(p.ID_TIPO_PONTO_SERVICO),
      status: p.DESC_STATUS_PONTO_SERVICO ?? null,
      estruturaId: num(p.ID_ESTRUTURA_PS),
      altura: num(p.ALTURA),
      cor: num(p.COR),
      parque: p.NOME_PARQUE_SERVICO ?? null,
      geometria: p.TIPO_GEOMETRIA ?? null,
    }))
    .sort((a, b) => (a.plaqueta ?? "").localeCompare(b.plaqueta ?? "", "pt-BR", { numeric: true }));

  writeFileSync(
    OUT,
    JSON.stringify({
      source: "Cidade Iluminada (Exati/IPBL) — pontos de iluminação pública de Blumenau",
      generatedAt: new Date().toISOString().slice(0, 10),
      bbox: estado.bbox,
      varreduraCompleta: completo,
      consultas: estado.discos.length,
      pixelsSaturados: estado.saturados,
      count: rows.length,
      rows,
    }),
  );
}

async function main(): Promise<void> {
  mkdirSync(resolve(ROOT, "data-sources"), { recursive: true });
  const estado = carregarEstado();
  const postes = carregarPostes();

  const cobertura = new Cobertura(estado.bbox);
  for (const [lat, lng, r] of estado.discos)
    cobertura.marcar(lat, lng, r, cobertura.indice(lat, lng));

  console.log(
    `postes: ${postes.size} · consultas anteriores: ${estado.discos.length} · ` +
      `raster ${cobertura.nLat}×${cobertura.nLng} (${(cobertura.total / 1e6).toFixed(1)}M pixels)`,
  );

  let feitas = 0;
  let interrompido: string | null = null;
  const t0 = Date.now();

  // Ctrl-C, queda da API ou qualquer erro: grava o estado antes de sair, senão
  // as consultas desde o último checkpoint viram retrabalho na próxima rodada.
  process.on("SIGINT", () => {
    writeFileSync(STATE, JSON.stringify(estado));
    console.log(`\nInterrompido. Estado salvo em ${STATE} — rode de novo para continuar.`);
    process.exit(0);
  });

  try {
    while (estado.cursor < cobertura.total && feitas < MAX_QUERIES) {
      if (cobertura.coberto(estado.cursor)) {
        estado.cursor++;
        continue;
      }

      const [lat, lng] = cobertura.centro(estado.cursor);
      const pontos = await consultarPontosProximos(lat, lng);
      feitas++;

      let novos = 0;
      for (const p of pontos) {
        const id = Number(p.ID_PONTO_SERVICO);
        if (postes.has(id)) continue;
        postes.set(id, p);
        appendFileSync(RAW, `${JSON.stringify(p)}\n`);
        novos++;
      }

      // Menos de 20 devolvidos ⇒ acabaram os postes do parque: cobre tudo.
      const raio =
        pontos.length < PAGE_LIMIT
          ? Number.POSITIVE_INFINITY
          : Number(pontos[pontos.length - 1].DISTANCIA) * MARGEM;

      estado.discos.push([lat, lng, raio]);
      if (!cobertura.marcar(lat, lng, raio, estado.cursor)) estado.saturados++;

      if (feitas % CHECKPOINT_A_CADA === 0) {
        writeFileSync(STATE, JSON.stringify(estado));
        const rps = feitas / ((Date.now() - t0) / 1000);
        const pct = ((estado.cursor / cobertura.total) * 100).toFixed(2);
        console.log(
          `consultas ${estado.discos.length} · postes ${postes.size} (+${novos}) · ` +
            `${pct}% do raster · ${(postes.size / estado.discos.length).toFixed(1)} postes/consulta · ` +
            `${rps.toFixed(1)} req/s`,
        );
      }

      await sleep(DELAY_MS);
    }
  } catch (err) {
    interrompido = String(err);
  }

  const completo = estado.cursor >= cobertura.total && !interrompido;
  writeFileSync(STATE, JSON.stringify(estado));
  exportar(postes, estado, completo);

  const saturados = estado.saturados
    ? ` ${estado.saturados} pixels saturados (>20 postes juntos) — conferir.`
    : "";
  const parcial = `Parcial: ${((estado.cursor / cobertura.total) * 100).toFixed(2)}% do raster. Rode de novo para continuar.`;
  const desfecho = completo
    ? `Varredura completa da bbox.${saturados}`
    : interrompido
      ? `API fora do ar (${interrompido}). ${parcial}`
      : parcial;
  console.log(`\n${postes.size} postes em ${estado.discos.length} consultas → ${OUT}\n${desfecho}`);
  if (completo) avisarSeBordaCortada(postes, estado.bbox);
}

/**
 * "Varredura completa da bbox" só vale o que a bbox vale. Poste encostado na
 * borda é sinal de que a cidade continua do lado de fora e a bbox está cortando
 * dado — foi o que aconteceu na primeira rodada, que parou em -26.69 enquanto o
 * município vai até -26.61. Melhor o script gritar do que a gente descobrir
 * depois conferindo na mão.
 */
function avisarSeBordaCortada(postes: Map<number, Ponto>, bbox: typeof BBOX_PADRAO): void {
  const MARGEM_BORDA = 0.0018; // ~200 m
  const perto = { norte: 0, sul: 0, leste: 0, oeste: 0 };
  for (const p of postes.values()) {
    const lat = Number(p.LATITUDE_TOTAL);
    const lng = Number(p.LONGITUDE_TOTAL);
    if (lat > bbox.latMax - MARGEM_BORDA) perto.norte++;
    if (lat < bbox.latMin + MARGEM_BORDA) perto.sul++;
    if (lng > bbox.lngMax - MARGEM_BORDA) perto.leste++;
    if (lng < bbox.lngMin + MARGEM_BORDA) perto.oeste++;
  }
  const cortadas = Object.entries(perto).filter(([, n]) => n > 0);
  if (!cortadas.length) return;
  const lados = cortadas.map(([lado, n]) => `${lado} (${n})`).join(", ");
  const recado =
    "A cidade provavelmente continua além do recorte. Rode de novo com uma BBOX\n" +
    "estendida desse lado (o postes-raw.jsonl acumula, nada é refeito à toa).";
  console.warn(`\nATENÇÃO: postes encostados na borda da bbox — ${lados}.\n${recado}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
