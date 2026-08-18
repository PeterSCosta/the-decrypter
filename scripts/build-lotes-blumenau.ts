/**
 * build-lotes-blumenau.ts — extrai o cadastro de lotes de Blumenau do geoportal
 * da Prefeitura (ArcGIS REST público) e monta a base local.
 *
 * Saída: seed-data/lotes-blumenau.json  ·  Run: pnpm build:lotes
 *
 * ── POR QUE BAIXAR EM VEZ DE CONSULTAR AO VIVO ──────────────────────────────
 * O serviço responde bem (2 s por página de 5.000), mas é um ArcGIS municipal:
 * ele não foi feito para receber uma consulta a cada tecla de uma bancada com
 * 106 decoders, e numa gincana a rede é justamente o que falta. Baixando uma
 * vez, a inscrição vira ponto no mapa offline — e a Prefeitura não paga a
 * conta do nosso fan-out.
 *
 * ── O QUE ESTE ARQUIVO **NÃO** GUARDA ───────────────────────────────────────
 * O polígono. São 84.539 lotes com dezenas de vértices cada; guardar a
 * geometria inteira levaria dezenas de MB para desenhar uma forma que ninguém
 * vai olhar. O que importa numa prova é O PONTO, então o script calcula o
 * centroide de cada anel e joga o resto fora.
 *
 * ── AS DUAS GRAFIAS, E POR QUE AS DUAS FICAM ────────────────────────────────
 * O mesmo lote tem `INSCRICAO_CADASTRAL` (15 dígitos, com zeros à esquerda) e
 * `IQ` (grupos com hífen, sem zeros: `4-1-24-20-2`). O carnê do IPTU traz uma,
 * o geoportal traz a outra, e quem digita não sabe disso — a base guarda as
 * duas para achar dos dois jeitos.
 */
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const CAMADA =
  "https://geo.blumenau.sc.gov.br/server/rest/services/consulta_construir/Lotes_info/MapServer/0";
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "seed-data/lotes-blumenau.json");

/** O teto do próprio servidor. Pedir mais devolve 5.000 do mesmo jeito. */
const PAGINA = 5000;
const CAMPOS = [
  "INSCRICAO_CADASTRAL",
  "IQ",
  "LOGRADOURO",
  "NUMERO",
  "BAIRRO",
  "CEP",
  "AREA_CARTOGRAFICA",
].join(",");

interface Feicao {
  attributes: Record<string, string | number | null>;
  geometry?: { rings?: [number, number][][] };
}

/**
 * Centroide do anel externo — média dos vértices.
 *
 * Não é o centroide de área (que exigiria a fórmula do polígono), e para lote
 * urbano a diferença é de metros: são quadriláteros, não formas côncavas. O que
 * importa é cair DENTRO do terreno, e a média resolve.
 */
function centro(rings: [number, number][][] | undefined): [number, number] | null {
  const anel = rings?.[0];
  if (!anel?.length) return null;
  let x = 0;
  let y = 0;
  for (const [lng, lat] of anel) {
    x += lng;
    y += lat;
  }
  // ArcGIS devolve [x, y] = [lng, lat]. Trocar a ordem aqui põe o Vale do
  // Itajaí no meio do oceano Índico — é o erro clássico deste formato.
  return [Number((y / anel.length).toFixed(6)), Number((x / anel.length).toFixed(6))];
}

const texto = (v: unknown): string => (typeof v === "string" ? v.trim() : v == null ? "" : `${v}`);

async function pagina(offset: number): Promise<Feicao[]> {
  const url =
    `${CAMADA}/query?where=1%3D1&outFields=${CAMPOS}` +
    `&returnGeometry=true&outSR=4326&resultOffset=${offset}&resultRecordCount=${PAGINA}&f=json`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`geoportal HTTP ${r.status} no offset ${offset}`);
  const d = (await r.json()) as { features?: Feicao[]; error?: { message?: string } };
  if (d.error) throw new Error(`geoportal: ${d.error.message ?? "erro"} no offset ${offset}`);
  return d.features ?? [];
}

async function main() {
  const contagem = await fetch(`${CAMADA}/query?where=1%3D1&returnCountOnly=true&f=json`);
  const { count } = (await contagem.json()) as { count: number };
  console.log(`lotes no geoportal: ${count.toLocaleString("pt-BR")}`);

  // Dicionários: 84 mil linhas repetem alguns milhares de nomes de rua e umas
  // dezenas de bairros. Guardar o índice em vez do texto é o que faz o arquivo
  // caber — mesma decisão da base de postes.
  const ruas = new Map<string, number>();
  const bairros = new Map<string, number>();
  const indice = (m: Map<string, number>, s: string): number => {
    if (!s) return -1;
    const j = m.get(s);
    if (j !== undefined) return j;
    const novo = m.size;
    m.set(s, novo);
    return novo;
  };

  const rows: (string | number)[][] = [];
  let semGeometria = 0;

  for (let off = 0; off < count; off += PAGINA) {
    const feicoes = await pagina(off);
    if (!feicoes.length) break;
    for (const f of feicoes) {
      const a = f.attributes;
      const pt = centro(f.geometry?.rings);
      if (!pt) semGeometria++;
      rows.push([
        texto(a.INSCRICAO_CADASTRAL),
        texto(a.IQ),
        indice(ruas, texto(a.LOGRADOURO)),
        texto(a.NUMERO),
        indice(bairros, texto(a.BAIRRO)),
        texto(a.CEP),
        pt ? pt[0] : 0,
        pt ? pt[1] : 0,
        Math.round(Number(a.AREA_CARTOGRAFICA ?? 0)),
      ]);
    }
    process.stdout.write(
      `\r  ${rows.length.toLocaleString("pt-BR")} / ${count.toLocaleString("pt-BR")}`,
    );
    // Educado com um servidor municipal: 17 requisições em fila, com pausa.
    await new Promise((r) => setTimeout(r, 400));
  }
  process.stdout.write("\n");

  const payload = {
    source: "Prefeitura de Blumenau — geoportal, camada consulta_construir/Lotes_info",
    url: CAMADA,
    generatedAt: new Date().toISOString().slice(0, 10),
    count: rows.length,
    aviso: "Coordenada = centroide do lote, não a porta do imóvel.",
    ruas: [...ruas.keys()],
    bairros: [...bairros.keys()],
    rows,
  };
  writeFileSync(OUT, JSON.stringify(payload));
  console.log(
    `lotes: ${rows.length} (${ruas.size} ruas · ${bairros.size} bairros · ${semGeometria} sem geometria) → ${OUT}`,
  );
}

main();
