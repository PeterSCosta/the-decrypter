/**
 * build-eixos-blumenau.ts — os EIXOS DE LOGRADOURO de Blumenau (o traçado das
 * ruas, trecho a trecho) do geoportal da Prefeitura (ArcGIS REST público).
 *
 * Saída: public/data/eixos-blumenau.json  ·  Run: pnpm build:eixos
 *
 * ── POR QUE ESTA CAMADA ─────────────────────────────────────────────────────
 * O Rol de Ruas (PDF) tem 4.426 trechos e nenhuma coordenada; quem geocodificou
 * casou o NOME com a base de CEP e deixou 1.248 (28,2%) sem ponto nenhum. Esta
 * camada tem 9.372 trechos com geometria de linha e, principalmente, o
 * `COD_LOG` — o mesmo código de logradouro do Rol. É join por CHAVE, não por
 * nome, e é isso que resgata o que o nome não resgatou (ver
 * `enrich-streets-eixos.ts`).
 *
 * ── O QUE ESTE ARQUIVO **NÃO** GUARDA ───────────────────────────────────────
 * A linha. São 9.372 trechos de até dezenas de vértices; guardar a geometria
 * inteira daria megabytes para desenhar um traço que ninguém vai olhar numa
 * prova. Fica só o PONTO MÉDIO de cada trecho — e médio DE VERDADE: o ponto na
 * metade do COMPRIMENTO, não a média dos vértices. Num trecho em L com 8
 * vértices amontoados numa ponta, a média dos vértices cai perto dessa ponta;
 * a metade do comprimento cai no meio da rua, que é o que se espera de um
 * "ponto da rua". O `bbox` também ficou de fora: dobraria o custo de
 * coordenada de cada linha para responder uma pergunta que nenhum decoder faz.
 *
 * ── PAGINAÇÃO: AQUI O `resultOffset` FUNCIONA (E MESMO ASSIM NÃO USAMOS) ────
 * Na tabela de ENDEREÇOS deste mesmo servidor o `resultOffset` é uma armadilha
 * conhecida (offset 5000 anda 3 linhas) e o OID se repete. **Nesta camada não**:
 * medido, `OBJECTID` é denso e único de 1 a 9.372, `outStatistics` responde e o
 * offset anda certo. Ainda assim a paginação aqui é por JANELA DE OBJECTID
 * (`OBJECTID >= a AND OBJECTID <= b`), porque a janela não depende de o
 * servidor honrar semântica nenhuma: ela é uma cláusula `where` comum. O preço
 * é zero e a garantia é total — no fim conferimos que a soma bate com o
 * `returnCountOnly`, e é essa conferência que denuncia truncamento.
 */
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const CAMADA =
  "https://geo.blumenau.sc.gov.br/server/rest/services/consulta_construir/Eixos/MapServer/0";
const OUT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "public/data/eixos-blumenau.json",
);

/** `maxRecordCount` da camada. Pedir mais devolve 1.000 do mesmo jeito. */
const PAGINA = 1000;
const PAUSA_MS = 350;

/**
 * O que se pede — e o que se deixa no servidor.
 *
 * Ficam de fora, MEDIDOS nas 9.372 linhas: `VLR_PGV` (0 em 100% — é o mesmo
 * campo zerado da planta de valores que já tinha entregado o dedo em outra
 * camada), `COD_LOG_NOVO` (preenchido em 4,1%), `TV_CABO`, `SCGAS` e as sete
 * larguras de pista/passeio, que descrevem obra viária e não localizam nada.
 * `CODIGO` é cópia de `COD_LOG` (diferem só nas 2 linhas sem logradouro), e
 * `LOGMETRICA` é cópia do `IQ`.
 *
 * NÃO existem nesta camada os campos `LEI`/`LEI_DATA` que o inventário citava —
 * a lei de denominação só está no Rol de Ruas, e o decoder `street-law` já vive
 * dela.
 */
const CAMPOS = [
  "OBJECTID",
  "COD_LOG", // código de logradouro — a chave do join com o Rol
  "DESCRICAO", // nome oficial da via nesta camada
  "QUA_DIREIT", // quadra de cada lado: prefixo de 4 grupos do IQ do lote
  "QUA_ESQUER",
  "BAIRRO_DIR", // "13-VELHA GRANDE" — o número é o mesmo do Rol
  "BAIRRO_ESQ",
  "CEP_DIREIT",
  "CEP_ESQUER",
  "SHAPE.LEN", // comprimento do trecho, em metros
].join(",");

interface Feicao {
  attributes: Record<string, string | number | null>;
  geometry?: { paths?: [number, number][][] };
}

/**
 * Ponto na METADE DO COMPRIMENTO da polilinha.
 *
 * A distância é euclidiana com a longitude encolhida por cos(lat) — na latitude
 * de Blumenau um grau de longitude vale ~0,89 de um de latitude, e sem essa
 * correção o "meio" escorrega nos trechos diagonais. Não é geodésica, e não
 * precisa ser: em 300 m de rua a diferença é centimétrica.
 */
function pontoMedio(paths: [number, number][][] | undefined): [number, number] | null {
  const pts = (paths ?? []).flat();
  if (!pts.length) return null;
  if (pts.length === 1) return [pts[0][1], pts[0][0]];

  const k = Math.cos((pts[0][1] * Math.PI) / 180);
  const seg: number[] = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot((pts[i][0] - pts[i - 1][0]) * k, pts[i][1] - pts[i - 1][1]);
    seg.push(d);
    total += d;
  }
  // Trecho degenerado (todos os vértices no mesmo lugar): o primeiro ponto serve.
  if (total === 0) return [pts[0][1], pts[0][0]];

  let acc = 0;
  for (let i = 0; i < seg.length; i++) {
    if (acc + seg[i] >= total / 2) {
      const t = (total / 2 - acc) / seg[i];
      const [ax, ay] = pts[i];
      const [bx, by] = pts[i + 1];
      // ArcGIS devolve [x, y] = [lng, lat]; a saída é [lat, lng]. Trocar os dois
      // aqui põe o Vale do Itajaí no oceano Índico — o erro clássico do formato.
      return [ay + (by - ay) * t, ax + (bx - ax) * t];
    }
    acc += seg[i];
  }
  const u = pts[pts.length - 1];
  return [u[1], u[0]];
}

const texto = (v: unknown): string => (typeof v === "string" ? v.trim() : v == null ? "" : `${v}`);

/** "13-VELHA GRANDE" → 13. Algumas linhas trazem só o nome, sem o número. */
function bairroNum(bruto: string, porNome: Map<string, number>): number | null {
  const m = /^(\d+)\s*-\s*(.+)$/.exec(bruto);
  if (m) return Number(m[1]);
  const achado = porNome.get(bruto.toUpperCase());
  return achado ?? null;
}

async function janela(de: number, ate: number): Promise<{ feicoes: Feicao[]; truncou: boolean }> {
  const where = encodeURIComponent(`OBJECTID >= ${de} AND OBJECTID <= ${ate}`);
  const url = `${CAMADA}/query?where=${where}&outFields=${encodeURIComponent(
    CAMPOS,
  )}&returnGeometry=true&outSR=4326&f=json`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`geoportal HTTP ${r.status} na janela ${de}-${ate}`);
  const d = (await r.json()) as {
    features?: Feicao[];
    exceededTransferLimit?: boolean;
    error?: { message?: string };
  };
  if (d.error) throw new Error(`geoportal: ${d.error.message ?? "erro"} na janela ${de}-${ate}`);
  return { feicoes: d.features ?? [], truncou: d.exceededTransferLimit === true };
}

async function main() {
  const r = await fetch(`${CAMADA}/query?where=1%3D1&returnCountOnly=true&f=json`);
  const { count } = (await r.json()) as { count: number };
  console.log(`eixos no geoportal: ${count.toLocaleString("pt-BR")}`);

  const brutas: Feicao[] = [];
  const vistos = new Set<number>();
  for (let de = 1; de <= count; de += PAGINA) {
    const ate = de + PAGINA - 1;
    const { feicoes, truncou } = await janela(de, ate);
    // Uma janela de N OIDs não pode devolver mais que N linhas; se o servidor
    // ainda assim avisar que cortou, a janela é grande demais e o silêncio
    // custaria trechos faltando sem ninguém notar.
    if (truncou) throw new Error(`janela ${de}-${ate} truncada — diminua PAGINA`);
    for (const f of feicoes) {
      const oid = Number(f.attributes.OBJECTID);
      // OID repetido significaria que a chave não é chave (o que ACONTECE na
      // tabela de endereços deste mesmo servidor) e o join sairia duplicado.
      if (vistos.has(oid)) throw new Error(`OBJECTID ${oid} repetido — a chave não é chave`);
      vistos.add(oid);
      brutas.push(f);
    }
    console.log(`  OID ${de}–${ate}: ${feicoes.length} (acumulado ${brutas.length})`);
    // Educado com um servidor municipal: 10 requisições em fila, com pausa.
    await new Promise((s) => setTimeout(s, PAUSA_MS));
  }

  if (brutas.length !== count) {
    throw new Error(`baixados ${brutas.length}, mas a camada diz ${count} — houve truncamento`);
  }

  // Tabela número→nome de bairro, montada com as linhas que trazem o prefixo
  // numérico, para resgatar as que trazem só o nome.
  const nomeParaNum = new Map<string, number>();
  for (const f of brutas) {
    for (const c of ["BAIRRO_DIR", "BAIRRO_ESQ"] as const) {
      const m = /^(\d+)\s*-\s*(.+)$/.exec(texto(f.attributes[c]));
      if (m) nomeParaNum.set(m[2].trim().toUpperCase(), Number(m[1]));
    }
  }

  // Dicionários: 9.372 trechos repetem 3.848 nomes, 917 quadras, 50 bairros e
  // 3.475 CEPs. Guardar o índice em vez do texto é o que faz o arquivo caber —
  // mesma decisão da base de lotes e da de postes.
  const nomes = new Map<string, number>();
  const quadras = new Map<string, number>();
  const bairros = new Map<string, number>();
  const ceps = new Map<string, number>();
  const indice = (m: Map<string, number>, s: string): number => {
    if (!s) return -1;
    const j = m.get(s);
    if (j !== undefined) return j;
    const novo = m.size;
    m.set(s, novo);
    return novo;
  };

  const rows: number[][] = [];
  let semGeometria = 0;
  let semCodigo = 0;

  for (const f of brutas) {
    const a = f.attributes;
    const cod = Number(a.COD_LOG ?? 0);
    const pt = pontoMedio(f.geometry?.paths);
    if (!pt) semGeometria++;
    // Sem código de logradouro o trecho não entra em join nenhum — são 2 linhas
    // sem nome, sem IQ e sem bairro, restos de cadastro.
    if (!cod) {
      semCodigo++;
      continue;
    }
    const bDir = texto(a.BAIRRO_DIR);
    const bEsq = texto(a.BAIRRO_ESQ);
    rows.push([
      cod,
      indice(nomes, texto(a.DESCRICAO)),
      pt ? Number(pt[0].toFixed(5)) : 0, // 5 casas ≈ 1 m: a rua não precisa de mais
      pt ? Number(pt[1].toFixed(5)) : 0,
      Math.round(Number(a["SHAPE.LEN"] ?? 0)),
      indice(quadras, texto(a.QUA_DIREIT)),
      indice(quadras, texto(a.QUA_ESQUER)),
      bairroNum(bDir, nomeParaNum) ?? -1,
      bairroNum(bEsq, nomeParaNum) ?? -1,
      indice(bairros, bDir.replace(/^\d+\s*-\s*/, "")),
      indice(bairros, bEsq.replace(/^\d+\s*-\s*/, "")),
      indice(ceps, texto(a.CEP_DIREIT).padStart(8, "0").slice(0, 8)),
      indice(ceps, texto(a.CEP_ESQUER).padStart(8, "0").slice(0, 8)),
    ]);
  }

  const payload = {
    source: "Prefeitura de Blumenau — geoportal, camada consulta_construir/Eixos",
    url: CAMADA,
    generatedAt: new Date().toISOString().slice(0, 10),
    count: rows.length,
    aviso:
      "Coordenada = ponto na metade do comprimento do TRECHO, não o meio da rua inteira nem a porta de um imóvel.",
    colunas: [
      "codLog",
      "nome",
      "lat",
      "lng",
      "comprimentoM",
      "quadraDir",
      "quadraEsq",
      "bairroNumDir",
      "bairroNumEsq",
      "bairroDir",
      "bairroEsq",
      "cepDir",
      "cepEsq",
    ],
    nomes: [...nomes.keys()],
    quadras: [...quadras.keys()],
    bairros: [...bairros.keys()],
    ceps: [...ceps.keys()],
    rows,
  };
  writeFileSync(OUT, `${JSON.stringify(payload)}\n`);

  console.log(
    `eixos: ${rows.length} trechos (${nomes.size} nomes · ${quadras.size} quadras · ` +
      `${bairros.size} bairros · ${ceps.size} CEPs · ${semGeometria} sem geometria · ` +
      `${semCodigo} descartados sem COD_LOG) → ${OUT}`,
  );
}

main();
