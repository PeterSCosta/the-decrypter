/**
 * Leitura de QR direto da matriz de módulos — sem foto, sem apontar celular
 * para a própria tela. Fecha a cadeia dentro da bancada: a grade remontada de
 * pedaços (ITC 2024 fatiou um QR no rodapé das etapas) vira texto ali mesmo.
 *
 * ATENÇÃO — o `import("jsqr")` é DINÂMICO de propósito, no mesmo molde do
 * `mapcode.ts`: ~13 KB gzip que só quem tem um QR na mão precisa pagar. E, como
 * lá, o módulo se parte em dois:
 *  - `diagnosticar` é SÍNCRONO e barato (só varredura de módulos, zero lib) e
 *    responde ANTES da tentativa "isto parece um QR?";
 *  - `decodeQr` é ASSÍNCRONO e só aí baixa a biblioteca.
 *
 * O pré-diagnóstico não é enfeite: o `jsQR` devolve `null` sem motivo nenhum, e
 * "não deu" custa vinte minutos de gincana. Dizer "25×25 = QR versão 2, mas o
 * marcador de baixo à esquerda tem 3 módulos errados" é o serviço.
 *
 * Escolha da lib (jsQR 1.4.0, Apache-2.0, zero dependências): come
 * `Uint8ClampedArray` RGBA cru, então o `toRgba` alimenta ela direto e nem
 * canvas entra no caminho da leitura. Está parada desde 2021 — assim como o
 * padrão QR. Escrever o decodificador na mão (máscaras + format info +
 * Reed-Solomon) não se paga.
 */
import { type Bitmap, MARGEM_PADRAO, MODULO_PADRAO, celula, dimensoes, toRgba } from "./render";

/** O que a matriz aparenta ser, para orientar antes de qualquer tentativa. */
export type FormaMatriz = "qr" | "codigo-de-barras" | "desenho";

/** Marcador de posição (finder pattern) achado: canto superior esquerdo dele. */
export interface Marcador {
  linha: number;
  coluna: number;
  /** Em qual canto ele caiu, ou `null` se está solto no meio da matriz. */
  canto: "topo-esquerdo" | "topo-direito" | "baixo-esquerdo" | null;
}

export interface Diagnostico {
  forma: FormaMatriz;
  linhas: number;
  colunas: number;
  quadrada: boolean;
  /** Versão do QR pela dimensão (21+4k), ou `null` se a dimensão não é de QR. */
  versao: number | null;
  /** Polaridade em que os marcadores apareceram: `true` = aceso é claro. */
  invertida: boolean;
  marcadores: Marcador[];
  /** Quantos dos 3 marcadores caíram no canto certo. */
  marcadoresNoCanto: number;
  /** Divergências do gabarito 7×7 em cada canto — 0 é marcador perfeito. */
  errosPorCanto: { topoEsquerdo: number; topoDireito: number; baixoEsquerdo: number };
  /** Módulos fora do lugar no timing pattern (linha 6 e coluna 6). */
  errosDeTiming: number;
  /** Orientação das barras, quando a forma é código de barras. */
  orientacao: "vertical" | "horizontal" | null;
  /** Observações em pt-BR, uma por linha, para listar na UI. */
  motivos: string[];
  /** Frase única pronta para o cabeçalho do painel. */
  resumo: string;
  /** Vale gastar o download da lib e tentar decodificar? */
  podeTentar: boolean;
}

/**
 * Gabarito do marcador de posição: anel cheio 7×7 com miolo 3×3. Os três
 * cantos de todo QR têm exatamente isto — é o sinal mais forte e mais barato
 * que existe para dizer "isto é um QR".
 */
const MARCADOR = ["#######", "#.....#", "#.###.#", "#.###.#", "#.###.#", "#.....#", "#######"].map(
  (l) => [...l].map((c) => c === "#"),
);

const LADO_MARCADOR = 7;
/** Menor QR possível (versão 1). Abaixo disso não há o que tentar. */
export const LADO_MINIMO_QR = 21;

/**
 * Dimensão → versão do QR. Todo QR é quadrado de 21+4k módulos: 21 (v1),
 * 25 (v2), 29 (v3) … 177 (v40). Qualquer outro número já mata a tentativa.
 */
export function versaoDeDimensao(lado: number): number | null {
  if (!Number.isInteger(lado)) return null;
  if (lado < LADO_MINIMO_QR || lado > 177) return null;
  if ((lado - LADO_MINIMO_QR) % 4 !== 0) return null;
  return (lado - LADO_MINIMO_QR) / 4 + 1;
}

/** Quantos dos 49 módulos do gabarito divergem nesta posição. */
function errosDoMarcador(
  bitmap: Bitmap,
  linha: number,
  coluna: number,
  invertida: boolean,
): number {
  let erros = 0;
  for (let r = 0; r < LADO_MARCADOR; r++) {
    for (let c = 0; c < LADO_MARCADOR; c++) {
      const lido = invertida
        ? !celula(bitmap, linha + r, coluna + c)
        : celula(bitmap, linha + r, coluna + c);
      if (lido !== MARCADOR[r][c]) erros++;
    }
  }
  return erros;
}

function cantoDe(
  linha: number,
  coluna: number,
  linhas: number,
  colunas: number,
): Marcador["canto"] {
  const fim = LADO_MARCADOR;
  if (linha === 0 && coluna === 0) return "topo-esquerdo";
  if (linha === 0 && coluna === colunas - fim) return "topo-direito";
  if (linha === linhas - fim && coluna === 0) return "baixo-esquerdo";
  return null;
}

/**
 * Varre a matriz INTEIRA atrás de marcadores, não só os três cantos. Custa
 * pouco (49 comparações por posição) e resolve o caso que mais aparece no
 * acervo: o QR remontado vem com moldura ou com a quiet zone já colada dentro
 * da grade, e aí os marcadores existem — só não estão nos cantos. Sem esta
 * varredura, a resposta seria "não parece um QR" quando o certo é "recorte".
 */
export function acharMarcadores(bitmap: Bitmap, invertida = false): Marcador[] {
  const { linhas, colunas } = dimensoes(bitmap);
  const achados: Marcador[] = [];
  for (let r = 0; r + LADO_MARCADOR <= linhas; r++) {
    for (let c = 0; c + LADO_MARCADOR <= colunas; c++) {
      if (errosDoMarcador(bitmap, r, c, invertida) === 0) {
        achados.push({ linha: r, coluna: c, canto: cantoDe(r, c, linhas, colunas) });
      }
    }
  }
  return achados;
}

/**
 * Timing pattern: linha 6 e coluna 6 alternam aceso/apagado entre os
 * marcadores, começando aceso em índice par. É a régua que o leitor usa para
 * contar módulos — errar aqui costuma ser erro de pintura, não de regra.
 */
function contarErrosDeTiming(bitmap: Bitmap, lado: number, invertida: boolean): number {
  let erros = 0;
  for (let i = LADO_MARCADOR + 1; i < lado - LADO_MARCADOR - 1; i++) {
    const esperado = i % 2 === 0;
    const h = invertida ? !celula(bitmap, 6, i) : celula(bitmap, 6, i);
    const v = invertida ? !celula(bitmap, i, 6) : celula(bitmap, i, 6);
    if (h !== esperado) erros++;
    if (v !== esperado) erros++;
  }
  return erros;
}

/** Mínimo de faixas para chamar de código de barras — abaixo disso é listra. */
const MIN_BARRAS = 12;
const MIN_TROCAS = 5;

/**
 * Barras uniformes: toda coluna (ou toda linha) chapada de ponta a ponta, com
 * várias trocas. O piso de 12 faixas evita chamar de código de barras um dígito
 * 3×5 — no `8` da fonte de segmentos, duas das três colunas são chapadas.
 */
function detectarBarras(bitmap: Bitmap): "vertical" | "horizontal" | null {
  const { linhas, colunas } = dimensoes(bitmap);
  if (linhas < 2 || colunas < 2) return null;

  const uniforme = (n: number, m: number, ler: (i: number, j: number) => boolean) => {
    const faixas: boolean[] = [];
    for (let i = 0; i < n; i++) {
      const v = ler(i, 0);
      for (let j = 1; j < m; j++) if (ler(i, j) !== v) return null;
      faixas.push(v);
    }
    let trocas = 0;
    for (let i = 1; i < faixas.length; i++) if (faixas[i] !== faixas[i - 1]) trocas++;
    return trocas >= MIN_TROCAS ? faixas.length : null;
  };

  if (colunas >= MIN_BARRAS && uniforme(colunas, linhas, (c, r) => celula(bitmap, r, c)) !== null) {
    return "vertical";
  }
  if (linhas >= MIN_BARRAS && uniforme(linhas, colunas, (r, c) => celula(bitmap, r, c)) !== null) {
    return "horizontal";
  }
  return null;
}

/**
 * O que esta matriz parece ser — síncrono, sem lib, para mostrar ANTES de a
 * pessoa tentar ler. Testa as duas polaridades: pintar de branco sobre preto é
 * um erro comum e barato de diagnosticar ("está invertida"), caro de descobrir
 * no chute.
 */
export function diagnosticar(bitmap: Bitmap): Diagnostico {
  const { linhas, colunas, irregular } = dimensoes(bitmap);
  const quadrada = linhas > 0 && linhas === colunas;
  const versao = quadrada ? versaoDeDimensao(linhas) : null;

  const normais = acharMarcadores(bitmap, false);
  const invertidos = normais.length > 0 ? [] : acharMarcadores(bitmap, true);
  const invertida = normais.length === 0 && invertidos.length > 0;
  const marcadores = invertida ? invertidos : normais;
  const marcadoresNoCanto = marcadores.filter((m) => m.canto !== null).length;

  const errosPorCanto = {
    topoEsquerdo: errosDoMarcador(bitmap, 0, 0, invertida),
    topoDireito: errosDoMarcador(bitmap, 0, colunas - LADO_MARCADOR, invertida),
    baixoEsquerdo: errosDoMarcador(bitmap, linhas - LADO_MARCADOR, 0, invertida),
  };
  const errosDeTiming =
    quadrada && linhas >= LADO_MINIMO_QR ? contarErrosDeTiming(bitmap, linhas, invertida) : 0;

  const orientacao = detectarBarras(bitmap);
  const pareceQr =
    marcadores.length >= 2 || (quadrada && versao !== null && marcadores.length >= 1);
  const forma: FormaMatriz = pareceQr ? "qr" : orientacao !== null ? "codigo-de-barras" : "desenho";

  const motivos: string[] = [];
  if (irregular)
    motivos.push("as linhas não têm todas o mesmo tamanho — o que falta conta como apagado");
  if (invertida)
    motivos.push("os marcadores só aparecem com as cores trocadas: a matriz está invertida");

  if (forma === "qr") {
    if (versao !== null) motivos.push(`dimensão ${linhas}×${colunas} = QR versão ${versao}`);
    else if (quadrada) {
      motivos.push(
        `dimensão ${linhas}×${colunas} não é de QR: um QR tem 21, 25, 29… (21+4k) módulos de lado`,
      );
    } else motivos.push(`dimensão ${linhas}×${colunas} não é quadrada, e todo QR é`);

    if (marcadoresNoCanto === 3) motivos.push("os 3 marcadores de canto estão presentes");
    else if (marcadoresNoCanto > 0)
      motivos.push(`só ${marcadoresNoCanto} dos 3 marcadores estão no canto`);
    if (marcadores.length > marcadoresNoCanto) {
      motivos.push(
        "há marcador fora do canto — provavelmente sobra moldura ou quiet zone em volta; recorte",
      );
    }
    for (const [rotulo, erros] of [
      ["superior esquerdo", errosPorCanto.topoEsquerdo],
      ["superior direito", errosPorCanto.topoDireito],
      ["inferior esquerdo", errosPorCanto.baixoEsquerdo],
    ] as const) {
      if (erros > 0 && erros <= 6)
        motivos.push(`o marcador ${rotulo} tem ${erros} módulo(s) errado(s)`);
    }
    if (errosDeTiming > 0)
      motivos.push(`o timing pattern tem ${errosDeTiming} módulo(s) fora do lugar`);
  } else if (forma === "codigo-de-barras") {
    const eixo = orientacao === "vertical" ? "colunas" : "linhas";
    motivos.push(`todas as ${eixo} são chapadas: parece código de barras, não matriz de módulos`);
    motivos.push("a bancada não lê código de barras — exporte o PNG e use o leitor do celular");
  } else {
    motivos.push(`${linhas}×${colunas} sem marcadores de canto: desenho livre`);
    if (quadrada && versao !== null) {
      motivos.push(`a dimensão até bate com QR versão ${versao}, mas não há marcador nenhum`);
    }
  }

  const podeTentar = linhas >= LADO_MINIMO_QR && colunas >= LADO_MINIMO_QR && marcadores.length > 0;

  return {
    forma,
    linhas,
    colunas,
    quadrada,
    versao,
    invertida,
    marcadores,
    marcadoresNoCanto,
    errosPorCanto,
    errosDeTiming,
    orientacao,
    motivos,
    resumo: montarResumo(forma, linhas, colunas, versao, marcadoresNoCanto, orientacao),
    podeTentar,
  };
}

function montarResumo(
  forma: FormaMatriz,
  linhas: number,
  colunas: number,
  versao: number | null,
  noCanto: number,
  orientacao: "vertical" | "horizontal" | null,
): string {
  const dim = `${linhas}×${colunas}`;
  if (linhas === 0 || colunas === 0) return "matriz vazia";
  if (forma === "qr") {
    const cabeca = versao !== null ? `${dim} = QR versão ${versao}` : `${dim} com marcadores de QR`;
    const cauda =
      noCanto === 3
        ? "os 3 marcadores de canto estão presentes"
        : noCanto > 0
          ? `${noCanto} de 3 marcadores no canto`
          : "os marcadores estão fora dos cantos";
    return `${cabeca}; ${cauda}.`;
  }
  if (forma === "codigo-de-barras") {
    const eixo = orientacao === "vertical" ? "colunas" : "linhas";
    return `${dim} com ${eixo} chapadas — parece código de barras.`;
  }
  return `${dim} — desenho livre (não é QR: falta o marcador 7×7 nos cantos).`;
}

/** Por que a leitura não saiu. Cada motivo tem uma saída prática diferente. */
export type FalhaQr =
  | "vazia"
  | "nao-quadrada"
  | "pequena-demais"
  | "sem-marcadores"
  | "nao-decodificou"
  | "lib-indisponivel";

export interface ResultadoQr {
  /** O que o QR dizia, ou `null`. */
  texto: string | null;
  /** Versão que o decodificador confirmou (pode divergir da dimensão crua). */
  versao: number | null;
  /** `true` quando só leu com as cores trocadas — vale contar para a pessoa. */
  invertido: boolean;
  falha: FalhaQr | null;
  /** Frase pt-BR pronta: o texto lido, ou o motivo exato de não ter lido. */
  motivo: string;
  /** Ressalvas que não impedem a leitura aqui mas atrapalham lá fora. */
  avisos: string[];
  diagnostico: Diagnostico;
}

/**
 * "Faltou margem" NÃO é motivo de falha aqui, e mentir sobre isso seria pior
 * que calar: medido, o `jsQR` lê a matriz colada sem quiet zone nenhuma, porque
 * recebe a imagem limpa e não uma foto. Quem exige os 4 módulos é o leitor do
 * CELULAR, sobre o PNG exportado — e é lá que a pessoa jura ter errado a regra
 * da prova quando só faltou a borda branca. Por isso a margem vira AVISO (e o
 * padrão do `toRgba`/`toPng` já vem certo), não veredito.
 */
export function avisoDeMargem(margem: number): string | null {
  if (margem >= MARGEM_PADRAO) return null;
  return `a imagem tem ${margem} módulo(s) de margem e a norma do QR pede ${MARGEM_PADRAO}: aqui dentro ainda lê, mas leitor de celular não acha o código sem essa borda branca`;
}

export interface OpcoesQr {
  /** Pixels por módulo entregues ao leitor. Padrão 8 — abaixo disso ele erra. */
  modulo?: number;
  /**
   * Quiet zone em módulos. Padrão 4, que é a norma. Existe como opção só para
   * a aba poder DEMONSTRAR a falha por falta de margem; em uso normal não mexa.
   */
  margem?: number;
}

type LibJsQr = typeof import("jsqr")["default"];

/**
 * Carrega o `jsQR` sob demanda. O `import()` fica isolado nesta função para que
 * o bundler gere UM chunk separado — puxar a lib para o topo do módulo faz o
 * chunk sumir e engorda a carga inicial de quem nunca vai ler um QR.
 */
const carregarJsQr = async (): Promise<LibJsQr | null> => {
  try {
    const mod = await import("jsqr");
    return mod.default ?? (mod as unknown as LibJsQr);
  } catch {
    return null;
  }
};

function falhar(
  falha: FalhaQr,
  motivo: string,
  diagnostico: Diagnostico,
  avisos: string[] = [],
): ResultadoQr {
  return { texto: null, versao: null, invertido: false, falha, motivo, avisos, diagnostico };
}

/**
 * Lê o QR direto da matriz de módulos. Nada de foto: o `toRgba` monta os pixels
 * exatos (módulo chapado, sem antisserrilhado) e o leitor recebe a imagem
 * perfeita que uma câmera nunca dá.
 *
 * As portas antes do download da lib são de graça e evitam o pior desfecho, que
 * é "não deu" sem explicação. Falha sempre com motivo acionável:
 *  - não é quadrada / é pequena demais → não é QR, é outra coisa;
 *  - nenhum marcador em nenhuma polaridade → não é QR (e não paga o download);
 *  - marcadores no lugar mas não decodificou → é erro de PINTURA: o
 *    Reed-Solomon conserta poucos módulos, e o resto precisa de conferência.
 */
export async function decodeQr(bitmap: Bitmap, opts: OpcoesQr = {}): Promise<ResultadoQr> {
  const diagnostico = diagnosticar(bitmap);
  const { linhas, colunas } = diagnostico;

  if (linhas === 0 || colunas === 0) {
    return falhar("vazia", "a matriz está vazia", diagnostico);
  }
  if (linhas !== colunas) {
    return falhar(
      "nao-quadrada",
      `a matriz não é quadrada (${linhas}×${colunas}) e todo QR é — isto não é um QR`,
      diagnostico,
    );
  }
  if (linhas < LADO_MINIMO_QR) {
    return falhar(
      "pequena-demais",
      `${linhas}×${colunas} é pequena demais: o menor QR (versão 1) tem ${LADO_MINIMO_QR} módulos de lado`,
      diagnostico,
    );
  }
  if (diagnostico.marcadores.length === 0) {
    return falhar(
      "sem-marcadores",
      "não achei nenhum marcador 7×7 (nem com as cores trocadas): isto não parece um QR",
      diagnostico,
    );
  }

  const lib = await carregarJsQr();
  if (!lib) {
    return falhar(
      "lib-indisponivel",
      "não consegui carregar o leitor de QR — sem rede na primeira vez que se usa",
      diagnostico,
    );
  }

  const modulo = opts.modulo ?? MODULO_PADRAO;
  const margem = opts.margem ?? MARGEM_PADRAO;
  const avisos = [avisoDeMargem(margem)].filter((a): a is string => a !== null);
  if (diagnostico.marcadores.length > diagnostico.marcadoresNoCanto) {
    avisos.push(
      "há marcador fora do canto: sobra moldura em volta da grade — recorte antes de exportar",
    );
  }

  // Duas passadas explícitas em vez de `attemptBoth`: assim se SABE em qual
  // polaridade leu, e "estava invertida" é informação que a pessoa quer.
  for (const inverter of [false, true]) {
    const { data, width, height } = toRgba(bitmap, { modulo, margem, inverter });
    const lido = lib(data, width, height, { inversionAttempts: "dontInvert" });
    if (lido?.data) {
      return {
        texto: lido.data,
        versao: lido.version ?? diagnostico.versao,
        invertido: inverter,
        falha: null,
        motivo: inverter
          ? "lido com as cores trocadas (a matriz estava invertida)"
          : "lido direto da matriz",
        avisos,
        diagnostico,
      };
    }
  }

  return falhar("nao-decodificou", montarMotivoDaFalha(diagnostico), diagnostico, avisos);
}

/**
 * A mensagem que substitui o `null` mudo do jsQR. Ordem do mais acionável para
 * o menos: recorte > dimensão > marcador quebrado > pintura.
 */
function montarMotivoDaFalha(d: Diagnostico): string {
  if (d.marcadores.length > d.marcadoresNoCanto && d.marcadoresNoCanto < 3) {
    return "os marcadores estão fora dos cantos: sobra moldura ou quiet zone dentro da grade — recorte até o marcador encostar no canto";
  }
  if (d.versao === null) {
    return `a matriz tem ${d.linhas} módulos de lado, e um QR tem 21, 25, 29… (21+4k) — falta ou sobra linha`;
  }
  if (d.marcadoresNoCanto < 3) {
    return `dimensão de QR versão ${d.versao}, mas só ${d.marcadoresNoCanto} dos 3 marcadores de canto fecham — confira os cantos primeiro`;
  }
  if (d.errosDeTiming > 0) {
    return `os marcadores fecham, mas o timing pattern (linha 6 e coluna 6) tem ${d.errosDeTiming} módulo(s) fora do lugar — a contagem de módulos está errada`;
  }
  return `a forma é de QR versão ${d.versao} e os marcadores fecham, mas o conteúdo não bate: o Reed-Solomon conserta poucos módulos errados, então há mais de um engano de pintura no miolo`;
}
