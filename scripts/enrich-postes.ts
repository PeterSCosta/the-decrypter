/**
 * Segunda passada sobre os postes de Blumenau: pega a **ficha completa** de cada
 * um pela plaqueta.
 *
 * A varredura do mapa ([`build-postes.ts`](./build-postes.ts)) usa
 * `ConsultarPontosProximos`, que devolve 21 campos. A consulta por plaqueta,
 * `ConsultarEtiquetaPontoServico`, devolve **55** — 34 a mais, entre eles:
 *
 *   - `NOME_BAIRRO` / `ID_BAIRRO` — bairro, que a consulta por proximidade não dá
 *   - `DESC_ESTRUTURA_PS` — a luminária de verdade ("Braço Curto (Até 1m);
 *     Aberta Padrão Celesc; Vapor De Sódio 70")
 *   - `DATA_HORA_INSTALACAO`, `PONTOS_LUMINOSOS`, `NOME_MUNICIPIO`, `SIGLA_UF`,
 *     coordenadas em grau/minuto/segundo
 *
 * Não dá para baratear: `ID_ESTRUTURA_PS` é quase único por poste (16 mil
 * valores distintos em 24 mil postes), então não é chave de catálogo — não
 * existe join local que substitua a consulta. É **uma requisição por poste**,
 * mas sem desperdício: a lista de plaquetas já é conhecida, nada é adivinhado.
 *
 * Retomável e idempotente: lê as plaquetas de `postes-raw.jsonl`, pula as que já
 * estão em `postes-fichas.jsonl` e anexa o resto. Pode rodar em rodadas curtas.
 *
 * Uso:
 *   pnpm enrich:postes                  # tudo que falta
 *   MAX_FICHAS=500 pnpm enrich:postes   # só um pedaço
 *   DELAY_MS=800 pnpm enrich:postes     # mais devagar
 */
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const RAW = resolve(ROOT, "data-sources/postes-raw.jsonl");
const FICHAS = resolve(ROOT, "data-sources/postes-fichas.jsonl");
const IMPOSSIVEIS = resolve(ROOT, "data-sources/postes-sem-ficha.json");
/**
 * Sai em `seed-data/`, não em `public/data/`: os postes **não** são baixados
 * pelo navegador — quem os serve é a API, a partir deste arquivo. O Vite copia
 * `public/` inteiro para o `dist/`, então deixá-lo lá mandaria 4 MB para dentro
 * da imagem do front sem nenhum consumidor.
 */
const OUT = resolve(ROOT, "seed-data/postes.json");

const API = "https://ipbl.exati.com.br/guia/command/ipbl";
const ID_PARQUE_SERVICO = 1;

const DELAY_MS = Number(process.env.DELAY_MS ?? 500);
const MAX_FICHAS = Number(process.env.MAX_FICHAS ?? Number.POSITIVE_INFINITY);
const TENTATIVAS = Number(process.env.TENTATIVAS ?? 8);
const CHECKPOINT_A_CADA = 200;

type Ficha = Record<string, string | number> & {
  ID_PONTO_SERVICO: number;
  NUMERO_IDENTIFICACAO?: string;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function consultarEtiqueta(plaqueta: string): Promise<Ficha | null> {
  const body = new URLSearchParams({
    "CMD.COMMAND": "ConsultarEtiquetaPontoServico",
    "CMD.ID_PARQUE_SERVICO": String(ID_PARQUE_SERVICO),
    "CMD.NUMERO_IDENTIFICACAO": plaqueta,
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
        RAIZ?: { ETIQUETAS?: { ETIQUETA?: Ficha | Ficha[] } };
      };
      const e = json.RAIZ?.ETIQUETAS?.ETIQUETA;
      if (!e) return null;
      return Array.isArray(e) ? (e[0] ?? null) : e;
    } catch (err) {
      if (tentativa >= TENTATIVAS) throw err;
      const espera = Math.min(60_000, 2000 * 2 ** (tentativa - 1));
      console.warn(
        `  ! ${String(err)} — tentativa ${tentativa}/${TENTATIVAS}, aguardando ${espera / 1000}s`,
      );
      await sleep(espera);
    }
  }
}

/**
 * Postes cuja ficha a API é **incapaz** de devolver, para não insistir neles a
 * cada rodada (sem isso o laço de retomada fica girando para sempre).
 *
 * A causa é um bug do backend: a busca por plaqueta come um dígito repetido.
 * Pedir `12222` devolve o poste da plaqueta `1222`; `22222` devolve `2222`;
 * `1118` devolve `11118`. Como só aceitamos a resposta quando o
 * `ID_PONTO_SERVICO` bate com o pedido, essas caem fora — e cairão sempre.
 * `ConsultarEtiquetaPontoServico` não aceita o ID do ponto como chave
 * alternativa, então não há contorno. Apague o arquivo para tentar de novo.
 */
function carregarImpossiveis(): number[] {
  if (!existsSync(IMPOSSIVEIS)) return [];
  return JSON.parse(readFileSync(IMPOSSIVEIS, "utf8")) as number[];
}

function lerJsonl<T>(caminho: string): T[] {
  if (!existsSync(caminho)) return [];
  return readFileSync(caminho, "utf8")
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as T);
}

/** Junta a varredura com as fichas e regrava o dataset público. */
function exportar(): void {
  const num = (v: unknown): number | null =>
    v === undefined || v === null || v === "" ? null : Number(v);
  const txt = (v: unknown): string | null =>
    v === undefined || v === null || v === "" ? null : String(v);

  const fichas = new Map<number, Ficha>();
  for (const f of lerJsonl<Ficha>(FICHAS)) fichas.set(Number(f.ID_PONTO_SERVICO), f);

  const vistos = new Set<number>();
  const rows: {
    id: number;
    plaqueta: string | null;
    lat: number;
    lng: number;
    rua: string | null;
    ruaTipo: string | null;
    ruaNome: string | null;
    ruaId: number | null;
    numero: number | null;
    bairro: string | null;
    bairroId: number | null;
    municipio: string | null;
    uf: string | null;
    tipo: string | null;
    status: string | null;
    estrutura: string | null;
    estruturaId: number | null;
    pontosLuminosos: number | null;
    altura: number | null;
    instalacao: string | null;
    alteracao: string | null;
    cor: number | null;
    ficha: boolean;
  }[] = [];
  for (const p of lerJsonl<Record<string, unknown>>(RAW)) {
    const id = Number(p.ID_PONTO_SERVICO);
    if (vistos.has(id)) continue;
    vistos.add(id);
    const f = fichas.get(id) ?? ({} as Ficha);
    rows.push({
      id,
      plaqueta: txt(p.NUMERO_IDENTIFICACAO),
      lat: Number(p.LATITUDE_TOTAL),
      lng: Number(p.LONGITUDE_TOTAL),
      rua: txt(p.NOME_LOGRADOURO_COMPLETO) ?? txt(p.ENDERECO),
      ruaTipo: txt(p.DESC_TIPO_LOGRADOURO),
      ruaNome: txt(p.NOME_LOGRADOURO),
      ruaId: num(p.ID_LOGRADOURO),
      numero: num(p.NUMERO_LOCAL_INICIAL),
      bairro: txt(f.NOME_BAIRRO),
      bairroId: num(f.ID_BAIRRO),
      municipio: txt(f.NOME_MUNICIPIO),
      uf: txt(f.SIGLA_UF),
      tipo: txt(p.DESC_TIPO_PONTO_SERVICO),
      status: txt(p.DESC_STATUS_PONTO_SERVICO),
      estrutura: txt(f.DESC_ESTRUTURA_PS),
      estruturaId: num(p.ID_ESTRUTURA_PS),
      pontosLuminosos: num(f.PONTOS_LUMINOSOS),
      altura: num(p.ALTURA),
      instalacao: txt(f.DATA_HORA_INSTALACAO),
      alteracao: txt(f.DATA_HORA_ALTERACAO),
      cor: num(p.COR),
      ficha: fichas.has(id),
    });
  }
  rows.sort((a, b) =>
    (a.plaqueta ?? "").localeCompare(b.plaqueta ?? "", "pt-BR", { numeric: true }),
  );

  /**
   * Formato posicional com dicionário — o mesmo desenho que `ceps.json` já usa.
   *
   * Em objeto, 45 mil linhas × 23 nomes de chave repetidos davam **20,8 MB**;
   * posicional com `rua`/`bairro`/`estrutura` dicionarizados (3.886 ruas
   * distintas, 43 bairros, 99 estruturas) dá **~4 MB**. O ganho é a repetição
   * das chaves e das strings, não a precisão: `municipio`/`uf` são constantes e
   * saem do dado para o cabeçalho, e `tipo`/`status` idem (uma única variação
   * nas 45.285 linhas). Coordenadas em 6 casas — a origem manda 17 dígitos
   * significativos, ruído abaixo de 11 cm.
   */
  const dicionario = <T extends string>(vals: (T | null)[]): [T[], Map<T, number>] => {
    const lista = [...new Set(vals.filter((v): v is T => v !== null))].sort();
    return [lista, new Map(lista.map((v, i) => [v, i]))];
  };
  // O logradouro vira UMA entrada: `rua` ("Rua XV de Novembro"), `ruaTipo`
  // ("Rua") e `ruaNome` ("XV de Novembro") são a mesma informação escrita três
  // vezes, e repeti-las por linha custava ~1,2 MB.
  const chaveLog = (r: (typeof rows)[number]) =>
    `${r.rua ?? ""} ${r.ruaTipo ?? ""} ${r.ruaNome ?? ""} ${r.ruaId ?? ""}`;
  const logMap = new Map<string, number>();
  const logradouros: (string | number | null)[][] = [];
  for (const r of rows) {
    const k = chaveLog(r);
    if (!logMap.has(k)) {
      logMap.set(k, logradouros.length);
      logradouros.push([r.rua, r.ruaTipo, r.ruaNome, r.ruaId]);
    }
  }

  const [bairros, idxBairro] = dicionario(rows.map((r) => r.bairro));
  const [estruturas, idxEstrutura] = dicionario(rows.map((r) => r.estrutura));
  const [tipos, idxTipo] = dicionario(rows.map((r) => r.tipo));
  const [situacoes, idxSituacao] = dicionario(rows.map((r) => r.status));

  const coord = (n: number) => Number(n.toFixed(6));
  const ref = <T extends string>(m: Map<T, number>, v: T | null) => (v === null ? -1 : m.get(v)!);
  // "dd/MM/yyyy HH:mm" → ISO, que é o que o Postgres aceita direto.
  const paraIso = (v: string | null) => {
    if (!v) return null;
    const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/);
    return m ? `${m[3]}-${m[2]}-${m[1]}T${m[4]}:${m[5]}:00` : null;
  };
  // Datas também vão para dicionário: o recadastramento de 2022 carimbou 41.791
  // postes com o mesmo instante, e escrever a ISO por linha custava ~1,9 MB.
  const [datas, idxData] = dicionario([
    ...rows.map((r) => paraIso(r.instalacao)),
    ...rows.map((r) => paraIso(r.alteracao)),
  ]);
  const data = (v: string | null) => ref(idxData, paraIso(v));

  writeFileSync(
    OUT,
    JSON.stringify({
      source: "Cidade Iluminada (Exati/IPBL) — pontos de iluminação pública de Blumenau",
      generatedAt: new Date().toISOString().slice(0, 10),
      municipio: "Blumenau",
      uf: "SC",
      count: rows.length,
      comFicha: rows.filter((r) => r.ficha).length,
      /** Ordem dos campos em `rows`. Ler daqui, não chumbar índice. */
      campos: [
        "id",
        "plaqueta",
        "lat",
        "lng",
        "logradouro",
        "numero",
        "bairro",
        "estrutura",
        "estruturaId",
        "tipo",
        "status",
        "pontosLuminosos",
        "altura",
        "instalacao",
        "alteracao",
        "cor",
      ],
      /** [completo, tipo, nome, id] — índice referenciado por `logradouro`. */
      logradouros,
      bairros,
      estruturas,
      tipos,
      situacoes,
      datas,
      rows: rows.map((r) => [
        r.id,
        r.plaqueta,
        coord(r.lat),
        coord(r.lng),
        logMap.get(chaveLog(r)),
        r.numero,
        ref(idxBairro, r.bairro),
        ref(idxEstrutura, r.estrutura),
        r.estruturaId,
        ref(idxTipo, r.tipo),
        ref(idxSituacao, r.status),
        r.pontosLuminosos,
        r.altura,
        data(r.instalacao),
        data(r.alteracao),
        r.cor,
      ]),
    }),
  );
}

async function main(): Promise<void> {
  const plaquetas = new Map<number, string>();
  for (const p of lerJsonl<Record<string, unknown>>(RAW)) {
    const plaqueta = p.NUMERO_IDENTIFICACAO;
    if (typeof plaqueta === "string" && plaqueta) {
      plaquetas.set(Number(p.ID_PONTO_SERVICO), plaqueta);
    }
  }
  const prontas = new Set(lerJsonl<Ficha>(FICHAS).map((f) => Number(f.ID_PONTO_SERVICO)));
  const impossiveis = new Set(carregarImpossiveis());
  const pendentes = [...plaquetas].filter(([id]) => !prontas.has(id) && !impossiveis.has(id));

  console.log(
    `${plaquetas.size.toLocaleString("pt-BR")} postes com plaqueta · ` +
      `${prontas.size.toLocaleString("pt-BR")} fichas prontas · ` +
      `${impossiveis.size} impossíveis · ` +
      `${pendentes.length.toLocaleString("pt-BR")} pendentes`,
  );

  let feitas = 0;
  let semFicha = 0;
  const t0 = Date.now();

  process.on("SIGINT", () => {
    console.log("\nInterrompido — as fichas já gravadas continuam válidas.");
    exportar();
    process.exit(0);
  });

  try {
    for (const [id, plaqueta] of pendentes) {
      if (feitas >= MAX_FICHAS) break;
      const f = await consultarEtiqueta(plaqueta);
      feitas++;

      // Só serve se vier o mesmo ponto de serviço que pedimos — ver
      // `carregarImpossiveis` sobre por que às vezes vem outro.
      if (f && Number(f.ID_PONTO_SERVICO) === id) {
        appendFileSync(FICHAS, `${JSON.stringify(f)}\n`);
      } else {
        semFicha++;
        impossiveis.add(id);
      }

      if (feitas % CHECKPOINT_A_CADA === 0) {
        const rps = feitas / ((Date.now() - t0) / 1000);
        const restam = (pendentes.length - feitas) / rps / 60;
        console.log(
          `${feitas.toLocaleString("pt-BR")}/${pendentes.length.toLocaleString("pt-BR")} · ` +
            `${semFicha} sem ficha · ${rps.toFixed(1)} req/s · ~${restam.toFixed(0)} min restantes`,
        );
        exportar();
        writeFileSync(IMPOSSIVEIS, JSON.stringify([...impossiveis]));
      }

      await sleep(DELAY_MS);
    }
  } catch (err) {
    console.error(`\nParou: ${String(err)}`);
  }

  exportar();
  writeFileSync(IMPOSSIVEIS, JSON.stringify([...impossiveis]));
  const total = lerJsonl<Ficha>(FICHAS).length;
  const divergentes = impossiveis.size
    ? `\n${impossiveis.size} postes sem ficha possível (bug do dígito repetido) → ${IMPOSSIVEIS}`
    : "";
  console.log(
    `\n${total.toLocaleString("pt-BR")} fichas completas de ${plaquetas.size.toLocaleString("pt-BR")} postes → ${OUT}${divergentes}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
