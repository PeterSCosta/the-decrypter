/**
 * Mapcode (mapcode.com) → coordenada. É o geocódigo da GIA-08 *Fragmentos do
 * Mundo*: o acróstico das iniciais entrega MAPCODE e o código `2JF.5R` cai na
 * Prefeitura de Blumenau.
 *
 * ATENÇÃO — o `import("mapcode-ts")` daqui é DINÂMICO de propósito (o primeiro
 * do projeto). A lib traz a tabela mundial de territórios inteira: ~305 KB gzip,
 * MAIS que o bundle completo da bancada (~239 KB gzip). Trocar por `import`
 * estático dobraria o tempo de carga para todo mundo — inclusive para quem nunca
 * vai colar um mapcode. Por isso o módulo se parte em dois:
 *  - `detectMapcode` é SÍNCRONO e barato (só uma regex de forma, zero lib);
 *  - `resolveMapcode` é ASSÍNCRONO e só aí paga o download, no mesmo molde do
 *    what3words dentro do MapCard.
 *
 * O outro motivo de a resolução ser cara: um mapcode local NÃO se decodifica
 * sozinho — `decode("2JF.5R")` LANÇA. O mesmo código é aceito por 467 dos 533
 * territórios, cada um devolvendo um ponto diferente. Adivinhar o território é o
 * trabalho, e o resultado sai etiquetado com a suposição (mesma honestidade do
 * `local-geocode`), nunca disfarçado de certeza.
 */
import { BRAZIL_BBOX, VALE_BBOX, inBBox } from "./anchors";
import type { GeoPoint } from "./formats";

/**
 * Alfabeto do mapcode: dígitos e letras SEM `I` e SEM `O` (o sistema os evita
 * porque se confundem com 1 e 0). Medido: em 20.385 códigos gerados, nenhum
 * trouxe `I`/`O` — o que faz desta classe um filtro de ruído de graça.
 */
const CODE_CHAR = "0-9A-HJ-NP-Z";
/** A extensão de precisão (`-XXXXXXXX`) exclui também o `Z`. */
const EXT_CHAR = "0-9A-HJ-NP-Y";
/** Códigos de território: 3 letras (`BRA`) ou pai-filho (`BR-SC`, `RU-KAM`). */
const TERRITORY = "[A-Z]{3}|[A-Z]{2,3}[-_][A-Z]{2,3}";

const MAPCODE_RE = new RegExp(
  `^(?:(${TERRITORY})[\\s]+)?([${CODE_CHAR}]{2,5}\\.[${CODE_CHAR}]{2,4}(?:-[${EXT_CHAR}]{1,8})?)$`,
);

export interface DetectedMapcode {
  /** Código sem território, normalizado em maiúsculas (ex.: `"2JF.5R"`). */
  code: string;
  /** Território explícito na entrada (`"BR-SC"`), ou `null` se não veio. */
  territory: string | null;
  /** Forma canônica completa — é o que se guarda e se passa ao resolvedor. */
  full: string;
}

/**
 * Detecta a FORMA de um mapcode na entrada (síncrono, sem lib). Não garante que
 * o código exista: quem confirma é `resolveMapcode`.
 *
 * O portão contra ruído é estreito de propósito, porque `X.Y` é uma forma
 * banal (versão, arquivo, decimal). Além da âncora de string inteira e do
 * alfabeto sem `I`/`O`, exige-se:
 *  - ao menos UMA letra — não existe mapcode só de dígitos (0 em 20.385
 *    medidos), então `"12.34"` é decimal, não lugar;
 *  - ao menos UM dígito, OU território explícito, OU a forma internacional
 *    (5+4). Isso derruba `"app.js"`, `"casa.rua"` e afins. O preço é perder o
 *    código curto 100% alfabético sem território — que, sem território, é
 *    indecifrável de qualquer jeito.
 */
export function detectMapcode(raw: string): DetectedMapcode | null {
  const m = raw.trim().toUpperCase().match(MAPCODE_RE);
  if (!m) return null;
  const territory = m[1] ? m[1].replace("_", "-") : null;
  const code = m[2];
  if (!/[A-Z]/.test(code)) return null;
  const [prefix, suffix] = code.split("-")[0].split(".");
  const international = prefix.length === 5 && suffix.length === 4;
  if (!/\d/.test(code) && !territory && !international) return null;
  return { code, territory, full: territory ? `${territory} ${code}` : code };
}

/** Como o território do ponto foi obtido — vira rótulo no card. */
export type MapcodeScope = "explicito" | "vale" | "brasil" | "internacional";

export interface MapcodeResolution extends GeoPoint {
  /** Código sem território, normalizado. */
  code: string;
  /** Território usado (`"BR-SC"`, ou `"AAA"` no internacional). */
  territory: string;
  /** Nome por extenso do território (`"Santa Catarina"`). */
  territoryName: string;
  scope: MapcodeScope;
  /** `true` quando o território foi ADIVINHADO, não informado na entrada. */
  assumed: boolean;
  /** Quantos dos 533 territórios aceitam este código (1 = sem ambiguidade). */
  ambiguity: number;
  /** Os outros territórios BRASILEIROS que também aceitam — pistas alternativas. */
  alternatives: { territory: string; territoryName: string; lat: number; lng: number }[];
  /** Rótulo pt-BR pronto para o card, já dizendo o que foi suposto. */
  detail: string;
}

type MapcodeLib = typeof import("mapcode-ts");
// Via `fromString` porque o construtor de `Territory` é privado (`InstanceType` não pega).
type MapcodeTerritory = ReturnType<MapcodeLib["Territory"]["fromString"]>;

/**
 * Carrega a lib sob demanda. O `import()` fica isolado nesta função para que o
 * bundler gere UM chunk separado — se alguém trouxer a lib para o topo do
 * módulo, o chunk some e a bancada inteira engorda.
 */
const loadMapcode = (): Promise<MapcodeLib> => import("mapcode-ts");

/** `decode` que devolve `null` em vez de lançar (o normal aqui é falhar). */
function tryDecode(
  lib: MapcodeLib,
  code: string,
  territory: MapcodeTerritory | null,
): GeoPoint | null {
  try {
    const p = lib.decode(code, territory);
    return { lat: p.getLatDeg(), lng: p.getLonDeg() };
  } catch {
    return null;
  }
}

/**
 * `Territory.fromString` — e NUNCA a string crua: passar `"BR-SC"` direto para
 * `decode` explode com `getParentTerritory is not a function` (bug real da
 * 1.0.1, o tipo aceita a string mas o código não).
 */
function territoryOf(lib: MapcodeLib, alphaCode: string): MapcodeTerritory | null {
  try {
    return lib.Territory.fromString(alphaCode);
  } catch {
    return null;
  }
}

/**
 * Territórios do Brasil: `BRA` e os estados `BR_XX`. Filtrar por
 * `startsWith("BR")` seria errado — pegaria BRB (Barbados) e BRN (Brunei).
 */
const isBrazil = (name: string) => name === "BRA" || name.startsWith("BR_");

const label = (t: MapcodeTerritory) => t.toString();

/**
 * Mapcode → coordenada. Ordem de resolução, da certeza ao palpite:
 *  1. território explícito na entrada;
 *  2. **BR-SC** filtrado pela caixa do Vale do Itajaí (o caso de casa);
 *  3. varredura dos territórios brasileiros filtrada pela caixa do Brasil;
 *  4. código internacional (decodifica sozinho, sem território).
 *
 * Devolve `null` quando nada decodifica — sem inventar ponto.
 */
export async function resolveMapcode(raw: string): Promise<MapcodeResolution | null> {
  const found = detectMapcode(raw);
  if (!found) return null;
  const lib = await loadMapcode();
  const { code } = found;

  // Ambiguidade real do código: quantos territórios o aceitam. Varredura dos 533
  // custa ~2 ms e é o dado mais honesto que se pode mostrar junto do palpite.
  const all = lib.Territory.values();
  const accepted = all.filter((t) => tryDecode(lib, code, t) !== null);
  const ambiguity = accepted.length;

  const brazil = accepted.filter((t) => isBrazil(t.name));
  const alternatives = brazil
    .map((t) => ({
      territory: label(t),
      territoryName: t.getFullName(),
      pt: tryDecode(lib, code, t),
    }))
    .filter((a) => a.pt !== null && inBBox(a.pt as GeoPoint, BRAZIL_BBOX))
    .map((a) => ({
      territory: a.territory,
      territoryName: a.territoryName,
      lat: (a.pt as GeoPoint).lat,
      lng: (a.pt as GeoPoint).lng,
    }));

  const build = (
    t: MapcodeTerritory,
    pt: GeoPoint,
    scope: MapcodeScope,
    detail: string,
  ): MapcodeResolution => ({
    ...pt,
    code,
    territory: label(t),
    territoryName: t.getFullName(),
    scope,
    assumed: scope !== "explicito",
    ambiguity,
    alternatives: alternatives.filter((a) => a.territory !== label(t)),
    detail,
  });

  // 1) Território explícito. Se ele não decodificar, o palpite segue adiante —
  // um prefixo digitado errado não deve apagar a resposta que existe.
  if (found.territory) {
    const t = territoryOf(lib, found.territory);
    const pt = t ? tryDecode(lib, code, t) : null;
    if (t && pt) return build(t, pt, "explicito", `${label(t)} (${t.getFullName()})`);
  }

  // 2) Casa: BR-SC, mas só se cair no Vale do Itajaí. É o palpite que a bancada
  // tem direito de dar sem pedir licença — e vai rotulado como suposição.
  const sc = territoryOf(lib, "BR-SC");
  const scPt = sc ? tryDecode(lib, code, sc) : null;
  if (sc && scPt && inBBox(scPt, VALE_BBOX)) {
    return build(sc, scPt, "vale", "assumindo BR-SC (Santa Catarina) — Vale do Itajaí");
  }

  // 3) Brasil: BR-SC primeiro (segue sendo o mais provável aqui), depois o resto.
  const brazilFirst = [...brazil].sort(
    (a, b) => Number(b.name === "BR_SC") - Number(a.name === "BR_SC"),
  );
  for (const t of brazilFirst) {
    const pt = tryDecode(lib, code, t);
    if (pt && inBBox(pt, BRAZIL_BBOX)) {
      return build(t, pt, "brasil", `assumindo ${label(t)} (${t.getFullName()}) — Brasil`);
    }
  }

  // 4) Internacional: o código longo (5+4) se decodifica sem território nenhum.
  const intl = tryDecode(lib, code, null);
  if (intl) {
    return {
      ...intl,
      code,
      territory: "AAA",
      territoryName: "Internacional",
      scope: "internacional",
      assumed: false,
      ambiguity,
      alternatives,
      detail: "código internacional (sem território)",
    };
  }
  return null;
}
