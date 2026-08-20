/**
 * build-estacoes-ibge.ts — estações geodésicas do IBGE no Vale do Itajaí.
 *
 * Saída: public/data/estacoes-ibge.json  ·  Run: pnpm build:estacoes
 *
 * ── O QUE É UMA ESTAÇÃO GEODÉSICA ───────────────────────────────────────────
 * Uma chapa de bronze cravada em ponte, calçada ou afloramento de rocha, com um
 * código curto gravado. É a mesma família da plaqueta de poste que a GIA-25
 * usou: objeto físico numerado, em lugar público, que a equipe pode ir tocar.
 *
 * ── A ARMADILHA, MEDIDA ─────────────────────────────────────────────────────
 * `nrMaxEstacoes` tem **default 20**. Sem o parâmetro, Blumenau devolve 20 e a
 * conclusão seria "Blumenau tem 20 estações". Com `nrMaxEstacoes=100`, são 82.
 * O teto do parâmetro é 100 — e quando um município bater nele o script **falha**,
 * em vez de avisar e seguir. Avisar num log que ninguém lê é o mesmo que truncar
 * em silêncio, e este repositório já perdeu dado assim.
 *
 * ── O QUE A API DÁ, E O QUE ESTE SCRIPT GUARDA ─────────────────────────────
 * São **41 campos** por estação. Medido em Blumenau (82 estações), o que vale a
 * pena e o quanto vem preenchido:
 *
 *   nomeEstacao          100%   NOVA PONTA AGUDA — nome que a bancada jogava fora
 *   tema                 100%   EG · RN · GPS · VT — é ELE que diz o que a estação é
 *   situacao             100%   BOM · DESTRUÍDO · NÃO ENCONTRADO
 *   localizacao           78%   "Ao norte da cidade de Blumenau - SC."
 *   observacao            12%
 *   inscricaoChapa         6%   a inscrição gravada na chapa
 *   itinerario             5%   "Partir da frente da Igreja Matriz…" — enunciado pronto
 *   altitudeOrtometrica    2%
 *
 * O `tema` é a descoberta que mais valeu: a bancada mostrava a LETRA crua do
 * `tipoEstacao` (`E`, `P`, `D`) porque não sabia o que ela queria dizer, e o
 * mapa é direto — E→EG (gravimétrica), R→RN (referência de nível), G→GPS,
 * V→VT (vértice de triangulação).
 */
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const API = "https://servicodados.ibge.gov.br/api/v1/bdg";
const OUT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "public/data/estacoes-ibge.json",
);

/** O território da gincana: Blumenau, Itajaí e a vizinhança que dá pé ir. */
const MUNICIPIOS: [string, string][] = [
  ["4202404", "Blumenau"],
  ["4208203", "Itajaí"],
  ["4211900", "Navegantes"],
  ["4205902", "Gaspar"],
  ["4207502", "Indaial"],
  ["4217600", "Timbó"],
  ["4213500", "Pomerode"],
  ["4202800", "Brusque"],
  ["4202008", "Balneário Camboriú"],
  ["4204202", "Camboriú"],
  ["4208302", "Itapema"],
  ["4212502", "Penha"],
  ["4201950", "Balneário Piçarras"],
  ["4208906", "Jaraguá do Sul"],
];

interface Estacao {
  codigoEstacao?: string;
  tipoEstacao?: string;
  tema?: string;
  nomeEstacao?: string;
  inscricaoChapa?: string;
  situacao?: string;
  descricaoEstacao?: string;
  localizacao?: string;
  itinerario?: string;
  altitudeOrtometrica?: string;
  latitude?: number;
  longitude?: number;
  municipio?: { nomeMunicipio?: string };
}

/** Corta e limpa um campo de texto livre — eles chegam com espaço duplo do BDG. */
const texto = (v: unknown, max: number) =>
  String(v ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

/**
 * A INSCRIÇÃO QUE ESTÁ NA PROSA, E NÃO NA COLUNA.
 *
 * O campo `inscricaoChapa` do BDG vem preenchido em **57 das 491** estações do
 * Vale (11,6%). Mas a descrição de outras 25 DIZ o que está gravado, em texto
 * corrido: "…estampada: RN 2004-R." É a mesma informação, do mesmo cadastro,
 * no campo errado — e a prova dá justamente o que está no bronze.
 *
 * ── O PROBLEMA: NEM TUDO DEPOIS DE "ESTAMPADA:" É INSCRIÇÃO ─────────────────
 * Das 25, treze não trazem código nenhum — trazem o NOME gravado na chapa
 * ("NOVA PONTE AGUDA 101", "SPITZCOPF 95") e uma delas é meta-texto puro
 * ("estampada: o nome da estação"). Indexar isso como chapa criaria inscrição
 * que não existe, que é a classe de erro que esta base inteira evita.
 *
 * ── O DISCRIMINANTE, MEDIDO ────────────────────────────────────────────────
 * Uma inscrição não tem PALAVRA: as corridas de letra são siglas (`RN`, `EP`,
 * `SG`, `SAT`) e há dígito. Nome gravado sempre traz palavra de 4+ letras. O
 * corte `sem corrida de 4 letras E com dígito` separou as candidatas **sem um
 * erro em nenhuma das duas colunas**, conferido uma a uma. Cobertura da chapa:
 * **57 → 70 (14,3%)**.
 *
 * ── LER A DESCRIÇÃO INTEIRA, NÃO A GUARDADA ────────────────────────────────
 * Esta função recebe `e.descricaoEstacao` CRU, antes do `texto(…, 180)`. Não é
 * detalhe: seis das treze inscrições ficam depois do caractere 180 (`RN 3011C`,
 * `RN 2008H`, `SAT 94026`, `SAT-91864`). Medir sobre a cópia truncada dá 12 e
 * parece certo — a primeira medição desta função deu exatamente isso.
 *
 * E o custo de um engano aqui é baixo por construção: a busca é casamento
 * EXATO, então uma extração ruim vira entrada de índice que ninguém acerta —
 * não vira resposta errada.
 */
function inscricaoNaDescricao(descricao?: string): string {
  const m = (descricao ?? "").match(/estampad[ao]\s*:?\s*([^.;]{1,30})/i);
  if (!m) return "";
  const bruto = m[1].trim().toUpperCase().replace(/[\s.]/g, "");
  if (!/^[A-Z0-9-]+$/.test(bruto)) return "";
  if (!/\d/.test(bruto)) return "";
  if (/[A-Z]{4,}/.test(bruto)) return "";
  return bruto;
}

async function main() {
  const rows: (string | number)[][] = [];
  const municipios: string[] = [];

  for (const [geo, nome] of MUNICIPIOS) {
    const r = await fetch(`${API}/municipio/${geo}/estacoes?nrMaxEstacoes=100`);
    if (!r.ok) {
      console.warn(`  ${nome}: HTTP ${r.status} — pulando`);
      continue;
    }
    const lista = (await r.json()) as Estacao[];
    if (!Array.isArray(lista)) continue;
    // Ver o bloco da armadilha: truncar calado é como o dado se perde.
    if (lista.length >= 100) {
      throw new Error(
        `${nome}: bateu no teto de nrMaxEstacoes=100. A API não pagina — este município precisa ser dividido ou o teto renegociado. Não vou gravar uma base truncada.`,
      );
    }

    const iMun = municipios.push(nome) - 1;
    for (const e of lista) {
      const cod = (e.codigoEstacao ?? "").trim();
      if (!cod || e.latitude == null || e.longitude == null) continue;
      rows.push([
        cod.toUpperCase(),
        iMun,
        (e.tipoEstacao ?? "").trim(),
        (e.situacao ?? "").trim(),
        // A descrição é o que transforma isto em pista: "chapa cravada na
        // cabeceira da ponte sobre o Rio Perequê" é praticamente um enunciado.
        texto(e.descricaoEstacao, 180),
        Number(e.latitude.toFixed(6)),
        Number(e.longitude.toFixed(6)),
        // ── Onda 5.1, ver o cabeçalho ──
        texto(e.tema, 8),
        texto(e.nomeEstacao, 60),
        texto(e.inscricaoChapa, 40) || inscricaoNaDescricao(e.descricaoEstacao),
        texto(e.localizacao, 140),
        // O itinerário é raro (5%) e é o campo mais próximo de um enunciado de
        // prova que existe nesta base — quando vem, vem inteiro.
        texto(e.itinerario, 300),
        texto(e.altitudeOrtometrica, 12),
      ]);
    }
    console.log(`  ${nome}: ${lista.length} estações`);
    await new Promise((r) => setTimeout(r, 250));
  }

  writeFileSync(
    OUT,
    JSON.stringify({
      source: "IBGE — Banco de Dados Geodésicos (BDG)",
      url: `${API}/municipio/{geocodigo}/estacoes`,
      generatedAt: new Date().toISOString().slice(0, 10),
      cobertura: "Vale do Itajaí e litoral próximo",
      count: rows.length,
      municipios,
      rows,
    }),
  );
  console.log(`estações: ${rows.length} em ${municipios.length} municípios → ${OUT}`);
}

main();
