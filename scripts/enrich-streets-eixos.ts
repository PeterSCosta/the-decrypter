/**
 * enrich-streets-eixos.ts — dá coordenada às ruas que o Rol não tinha, casando
 * por CHAVE (o código de logradouro) em vez de por nome.
 *
 * Entrada: public/data/eixos-blumenau.json + public/data/streets.json
 * Saída:   public/data/streets.json (reescrito no lugar)  ·  Run: pnpm enrich:streets
 *
 * ── O BURACO QUE ISTO TAPA ──────────────────────────────────────────────────
 * `geocode-streets.ts` casa `street.nome` ↔ `cep.logradouro` por TEXTO. Texto
 * erra: o Rol escreve "ALWIN FLOHR" e o cadastro "ALWIM FLOHR", o Rol abrevia
 * "DR. AMADEU DA LUZ" e o cadastro escreve "DOUTOR AMADEU DA LUZ", e o PDF
 * corta o nome em 31 caracteres no meio de um parêntese. Resultado medido:
 * 1.248 dos 4.426 trechos (28,2%) ficaram sem coordenada nenhuma.
 * O `COD_LOG` do geoportal é o MESMO número do `codigo` do Rol — join por
 * chave não se importa com grafia, e resgata 1.108 dessas 1.248 linhas.
 *
 * ── POR QUE O JOIN É POR (CÓDIGO + BAIRRO) ──────────────────────────────────
 * O Rol tem uma linha por (rua × bairro): a "1 DE JANEIRO" aparece três vezes,
 * uma para cada bairro que ela atravessa, e as três são trechos diferentes da
 * cidade. Dar às três o mesmo ponto seria jogar duas delas no bairro errado.
 * Os eixos trazem `BAIRRO_DIR`/`BAIRRO_ESQ` com o MESMO número de bairro do Rol
 * (conferido: os 35 números que aparecem nas duas bases batem por nome, zero
 * divergências), então o join fino é possível — e é ele que resolve 1.074 das
 * 1.108. O join só por código é a rede de segurança para as outras 34.
 *
 * ── O PONTO É DE UM TRECHO REAL, NÃO UMA MÉDIA NO AR ────────────────────────
 * Uma rua tem vários trechos. A média dos pontos médios de uma rua em "L" cai
 * DENTRO DO QUARTEIRÃO, fora do asfalto. Então: calcula-se o centro (ponderado
 * pelo comprimento, para o trecho de 800 m pesar mais que o de 40 m) e depois
 * ENCOSTA-SE esse centro no ponto médio do trecho mais próximo. O que fica
 * gravado é sempre um ponto que existe na rua.
 *
 * ── O NOME DO ROL NÃO É SOBRESCRITO ─────────────────────────────────────────
 * Em 111 códigos o nome dos eixos difere de verdade do nome do Rol (fora as 239
 * diferenças que são só o parêntese do Rol, "(direito)", "(até nº 508)"). Às
 * vezes quem está certo é o geoportal ("ANNA CATHARINA LENZ" contra o "LEZ" do
 * PDF), às vezes é o Rol. Trocar em silêncio apagaria a evidência, então o nome
 * do Rol FICA e o do geoportal entra ao lado, em `nomeEixos`, só quando difere.
 *
 * ── ORDEM DE EXECUÇÃO (IMPORTA) ────────────────────────────────────────────
 * `build:streets` → `build:streets-geo` → `build:eixos` → `enrich:streets`.
 * O `geocode-streets.ts` ZERA `lat`/`lng` de quem não casa por nome, então
 * rodar ele DEPOIS deste script desfaria o resgate. Por isso este script é a
 * autoridade sobre `fonteGeo`/`nomeEixos`: ele reescreve os dois em TODAS as
 * linhas a cada execução (apagando onde não se aplica), e assim uma reexecução
 * fora de ordem se conserta sozinha em vez de deixar metadado mentindo.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const STREETS = resolve(ROOT, "public/data/streets.json");
const EIXOS = resolve(ROOT, "public/data/eixos-blumenau.json");

interface StreetRow {
  codigo: number;
  nome: string;
  bairroNum: number | null;
  bairro: string;
  lat?: number;
  lng?: number;
  fonteGeo?: string;
  nomeEixos?: string;
  [k: string]: unknown;
}
interface StreetsFile {
  rows: StreetRow[];
  [k: string]: unknown;
}
interface EixosFile {
  colunas: string[];
  nomes: string[];
  rows: number[][];
}

const streets = JSON.parse(readFileSync(STREETS, "utf8")) as StreetsFile;
const eixos = JSON.parse(readFileSync(EIXOS, "utf8")) as EixosFile;

const col = (nome: string): number => {
  const i = eixos.colunas.indexOf(nome);
  if (i < 0) throw new Error(`coluna ${nome} não existe em eixos-blumenau.json`);
  return i;
};
const C = {
  cod: col("codLog"),
  nome: col("nome"),
  lat: col("lat"),
  lng: col("lng"),
  len: col("comprimentoM"),
  bDir: col("bairroNumDir"),
  bEsq: col("bairroNumEsq"),
};

/**
 * Tira as marcas de acento pelo ponto de código, não por classe de caractere.
 * A classe `[\u0300-\u036f]` escrita literalmente casa caractere + combinante e
 * o Biome recusa (`noMisleadingCharacterClass`) — o mesmo desvio que
 * `geocode-streets.ts` já faz, pelo mesmo motivo.
 */
function semAcento(s: string): string {
  let out = "";
  for (const ch of s.normalize("NFD")) {
    const c = ch.codePointAt(0) ?? 0;
    if (c < 0x0300 || c > 0x036f) out += ch;
  }
  return out;
}

/** Sem acento, maiúsculo, só letras e dígitos — para COMPARAR, nunca para gravar. */
const dobra = (s: string): string =>
  semAcento(s)
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Mesma dobra, sem o "(direito)" / "(até nº 508)" que só o Rol usa. */
const semParenteses = (s: string): string => dobra(s.replace(/\([^)]*\)/g, " "));

interface Trecho {
  lat: number;
  lng: number;
  len: number;
}
const porCodigo = new Map<number, Trecho[]>();
const porCodigoBairro = new Map<string, Trecho[]>();
const nomeDoCodigo = new Map<number, string>();

const empurra = (m: Map<string | number, Trecho[]>, k: string | number, t: Trecho) => {
  const l = m.get(k);
  if (l) l.push(t);
  else m.set(k, [t]);
};

for (const r of eixos.rows) {
  const cod = r[C.cod];
  const t: Trecho = { lat: r[C.lat], lng: r[C.lng], len: Math.max(1, r[C.len]) };
  if (!t.lat && !t.lng) continue;
  empurra(porCodigo as Map<string | number, Trecho[]>, cod, t);
  if (!nomeDoCodigo.has(cod)) nomeDoCodigo.set(cod, eixos.nomes[r[C.nome]] ?? "");
  // O trecho encosta em até dois bairros (um de cada lado); ele conta para os
  // dois, senão a rua de divisa some do bairro em que ela também está.
  for (const b of new Set([r[C.bDir], r[C.bEsq]])) {
    if (b >= 0) empurra(porCodigoBairro as Map<string | number, Trecho[]>, `${cod}|${b}`, t);
  }
}

/**
 * Centro ponderado pelo comprimento, encostado no trecho mais próximo.
 * O `cos(lat)` corrige a longitude; sem ele o "mais próximo" erra nas diagonais.
 */
function ponto(trechos: Trecho[]): { lat: number; lng: number } {
  let sl = 0;
  let sg = 0;
  let peso = 0;
  for (const t of trechos) {
    sl += t.lat * t.len;
    sg += t.lng * t.len;
    peso += t.len;
  }
  const cl = sl / peso;
  const cg = sg / peso;
  const k = Math.cos((cl * Math.PI) / 180);
  let melhor = trechos[0];
  let dist = Number.POSITIVE_INFINITY;
  for (const t of trechos) {
    const d = Math.hypot((t.lng - cg) * k, t.lat - cl);
    if (d < dist) {
      dist = d;
      melhor = t;
    }
  }
  return { lat: melhor.lat, lng: melhor.lng };
}

let jaTinha = 0;
let porBairro = 0;
let soCodigo = 0;
let semJeito = 0;
let nomesDivergentes = 0;
let nomesSoParenteses = 0;
const exemplos: string[] = [];

for (const row of streets.rows) {
  /**
   * Reexecução: a coordenada que ESTE script escreveu se reconhece pelo próprio
   * `fonteGeo`, e é descartada para ser recalculada. Sem isso a segunda passada
   * lia o ponto que ela mesma gravou como se fosse do join por nome, contava-o
   * em "já tinha", saía pelo `continue` — e ia embora deixando o `fonteGeo`
   * apagado logo acima. O ponto sobrevivia, a procedência não: exatamente o
   * metadado mentindo que a ordem de execução deveria impedir.
   */
  if (row.fonteGeo) {
    row.lat = undefined;
    row.lng = undefined;
  }
  row.fonteGeo = undefined;
  row.nomeEixos = undefined;

  const oficial = nomeDoCodigo.get(row.codigo);
  if (oficial && dobra(oficial) !== dobra(row.nome)) {
    if (semParenteses(oficial) === semParenteses(row.nome)) {
      nomesSoParenteses++;
    } else {
      nomesDivergentes++;
      row.nomeEixos = oficial; // ao lado do nome do Rol, nunca por cima
      if (exemplos.length < 10) exemplos.push(`${row.codigo}: Rol "${row.nome}" ≠ "${oficial}"`);
    }
  }

  if (row.lat != null && row.lng != null) {
    jaTinha++;
    continue;
  }

  const fino = row.bairroNum != null ? porCodigoBairro.get(`${row.codigo}|${row.bairroNum}`) : null;
  const grosso = porCodigo.get(row.codigo);
  const trechos = fino?.length ? fino : grosso;
  if (!trechos?.length) {
    semJeito++;
    continue;
  }

  const p = ponto(trechos);
  row.lat = p.lat;
  row.lng = p.lng;
  if (fino?.length) {
    row.fonteGeo = "eixos:codigo+bairro";
    porBairro++;
  } else {
    row.fonteGeo = "eixos:codigo";
    soCodigo++;
  }
}

const comCoord = streets.rows.filter((r) => r.lat != null && r.lng != null).length;
streets.geocoded = comCoord;
streets.geocodadoPorEixos = porBairro + soCodigo;
streets.geocodedAt = new Date().toISOString();
writeFileSync(STREETS, `${JSON.stringify(streets)}\n`);

const pct = (n: number) => ((n / streets.rows.length) * 100).toFixed(1);
console.log(`linhas do Rol: ${streets.rows.length}`);
console.log(`  já tinham coordenada (join por nome com CEP): ${jaTinha} (${pct(jaTinha)}%)`);
console.log(`  resgatadas por código+bairro:                 ${porBairro}`);
console.log(`  resgatadas só por código:                     ${soCodigo}`);
console.log(`  seguem sem coordenada:                        ${semJeito} (${pct(semJeito)}%)`);
console.log(`TOTAL com coordenada: ${comCoord} (${pct(comCoord)}%)`);
console.log(
  `\nnomes: ${nomesDivergentes} divergem de verdade (gravados em nomeEixos), ` +
    `${nomesSoParenteses} diferem só pelo parêntese do Rol (ignorados)`,
);
console.log(exemplos.join("\n"));
