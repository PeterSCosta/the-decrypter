import {
  IC_ALEATORIO,
  IC_INGLES,
  IC_PORTUGUES,
  type RetratoDoTexto,
  icPorColuna,
  retratoDoTexto,
} from "@/features/decoder/engine/criptanalise";

/**
 * A LEITURA do retorno estatístico — o que os números QUEREM DIZER.
 *
 * ── POR QUE ISTO É UM ARQUIVO, E NÃO TEXTO DENTRO DO COMPONENTE ─────────────
 * Porque é a parte que pode estar errada. Calcular índice de coincidência é
 * aritmética e já está testado em `criptanalise.ts`; dizer "IC de 0,072 com
 * perfil que não encaixa significa substituição monoalfabética" é uma AFIRMAÇÃO
 * sobre o mundo, e afirmação sobre o mundo tem de ter teste.
 *
 * O motor já trazia essa leitura escrita — no comentário de `retratoDoTexto`.
 * Ela estava certa e invisível: 879 linhas de criptanálise medidas e testadas,
 * com **zero consumidores de produção** fora do `vigenere-crack`. Este módulo
 * não inventa análise nova; ele publica a que já existia.
 *
 * ── E O QUE ELE SE RECUSA A DIZER ──────────────────────────────────────────
 * Abaixo de 150 letras o próprio motor não afirma idioma, porque foi medido que
 * não há corte que separe (em 60 letras o texto cifrado às vezes casa melhor com
 * o perfil que o texto real). Aqui isso vira um veredito explícito de "amostra
 * curta demais" em vez de um palpite com cara de resposta.
 */

export type Veredito = "curto" | "claro" | "monoalfabetica" | "polialfabetica" | "nao-e-texto";

export interface Leitura {
  veredito: Veredito;
  /** O título do cartão — o que a bancada afirma. */
  titulo: string;
  /** Por que ela afirma isso, nos números que estão na tela. */
  porque: string;
  /** O que fazer em seguida — o valor prático da aba. */
  sugestao: string;
  /** `false` quando a amostra não sustenta afirmação nenhuma. */
  confiavel: boolean;
}

/** Abaixo disto o motor não afirma idioma, e nós não afirmamos cifra. */
export const MIN_LETRAS_VEREDITO = 150;

/**
 * O corte do `encaixeIc` — 0 é aleatório, 1 é português corrido.
 *
 * `ALTO` separa "tem IC de linguagem natural" de "não tem". Ele fica abaixo do
 * IC do inglês (0,0656 → encaixe 0,79), para que texto em inglês não caia do
 * lado errado.
 */
export const ENCAIXE_ALTO = 0.7;

/**
 * ── POR QUE NÃO EXISTE UM `ENCAIXE_BAIXO` ──────────────────────────────────
 *
 * A primeira versão tinha um: abaixo de 0,4 o texto era "não é texto", entre
 * 0,4 e 0,7 era "polialfabética". **Medido, isso é errado em espécie, não em
 * valor** — o IC global simplesmente não separa Vigenère de ruído:
 *
 * | caso | encaixe global | melhor coluna |
 * |---|---:|---:|
 * | claro / César | 1,18 | 1,35 |
 * | **Vigenère (chave 3, 7 e 12)** | **0,07 a 0,22** | **1,29 a 1,34** |
 * | aleatório | 0,03 | **0,17** |
 *
 * O Vigenère de chave 12 tem encaixe 0,07 — mais perto do ruído (0,03) que de
 * qualquer corte razoável. Nenhum limiar global os separa, porque é da natureza
 * da cifra: chave longa aproxima o texto do aleatório, e é isso que ela faz de
 * bom.
 *
 * Quem separa é o **IC por coluna**: fatiado no comprimento certo da chave,
 * cada coluna vira um César puro e recupera o IC do idioma (1,29-1,34), coisa
 * que o ruído não faz em coluna nenhuma (0,17). Então o veredito de
 * polialfabética não vem de um número global — vem de existir uma coluna que
 * sobe. É mais trabalho e é a única leitura honesta.
 */
export const COLUNAS_TESTADAS = 16;

/**
 * @param texto o texto original — o perfil por coluna precisa dele, e não do
 *   retrato, porque o `RetratoDoTexto` não guarda as colunas.
 */
export function lerRetrato(r: RetratoDoTexto, texto = ""): Leitura {
  if (r.letras < MIN_LETRAS_VEREDITO) {
    return {
      veredito: "curto",
      titulo: `Amostra curta — ${r.letras} letras`,
      porque: `Abaixo de ${MIN_LETRAS_VEREDITO} letras a estatística não separa: medido, em 60 letras um texto cifrado às vezes casa com o perfil do idioma melhor que um texto real.`,
      sugestao: "Os números abaixo continuam valendo como observação; o veredito, não.",
      confiavel: false,
    };
  }

  if (r.encaixeIc >= ENCAIXE_ALTO && r.idioma) {
    return {
      veredito: "claro",
      titulo: `Texto em claro, em ${r.idioma === "pt" ? "português" : "inglês"}`,
      porque: `IC ${r.ic.toFixed(4)} (encaixe ${(r.encaixeIc * 100).toFixed(0)}%) e o perfil de letras casa com o idioma (χ² ${r.qui.letras[r.idioma].qui.toFixed(2)}).`,
      sugestao:
        "Se isto devia estar cifrado, procure a mensagem DENTRO do texto: acróstico, letras por posição, contagem por linha.",
      confiavel: true,
    };
  }

  if (r.encaixeIc >= ENCAIXE_ALTO) {
    return {
      veredito: "monoalfabetica",
      titulo: "Substituição monoalfabética",
      porque: `IC ${r.ic.toFixed(4)} é de linguagem natural (encaixe ${(r.encaixeIc * 100).toFixed(0)}%), mas nenhum perfil de idioma casa. Embaralhar o alfabeto não mexe no IC — só no perfil.`,
      sugestao:
        "César, Atbash, disco cifrante ou substituição livre. O solver de substituição resolve a partir de 200 letras; a força bruta de César, sempre.",
      confiavel: true,
    };
  }

  // IC global baixo: só o perfil por coluna distingue polialfabética de ruído.
  // Ver o bloco de `ENCAIXE_ALTO` para os números que obrigam a isso.
  const periodo = periodoProvavel(texto);
  if (periodo) {
    return {
      veredito: "polialfabetica",
      titulo: `Polialfabética, chave de ${periodo.n} letra${periodo.n > 1 ? "s" : ""}`,
      porque: `O IC inteiro é ${r.ic.toFixed(4)} — quase aleatório. Mas fatiado em ${periodo.n} colunas cada fatia recupera IC de idioma (encaixe ${(periodo.encaixe * 100).toFixed(0)}%), e isso só acontece no comprimento certo da chave.`,
      sugestao: `Vigenère, Beaufort, Porta ou autokey com chave de ${periodo.n}. O quebrador de Vigenère resolve sozinho a partir de 150 letras.`,
      confiavel: true,
    };
  }

  return {
    veredito: "nao-e-texto",
    titulo: "Não parece texto cifrado por substituição",
    porque: `IC ${r.ic.toFixed(4)} está no aleatório (${IC_ALEATORIO.toFixed(4)}), e nenhuma fatia de 2 a ${COLUNAS_TESTADAS} colunas recupera IC de idioma — então também não é polialfabética.`,
    sugestao:
      "Provavelmente é codificação (Base64, hex), dado binário, ou texto de outro alfabeto. A faixa de dicas do Decodificador diz o quê.",
    confiavel: true,
  };
}

/**
 * O MENOR período cujo IC por coluna volta a ser de idioma — ou `null`.
 *
 * Menor, e não o maior encaixe: os múltiplos do período também sobem (uma chave
 * de 3 acende em 3, 6, 9 e 12), e reportar 12 quando a chave tem 3 é dizer a
 * verdade da forma menos útil possível.
 */
export function periodoProvavel(texto: string): { n: number; encaixe: number } | null {
  for (const p of perfilDeColuna(texto, COLUNAS_TESTADAS)) {
    if (p.n > 1 && p.encaixe >= ENCAIXE_ALTO) return p;
  }
  return null;
}

/**
 * O comprimento de chave que o IC por coluna sugere.
 *
 * Fatia o texto em `n` colunas e mede o IC de cada uma: se `n` é o comprimento
 * certo, cada coluna é um César puro e tem IC de idioma. Devolve a lista inteira
 * para a tela mostrar o perfil, não só o vencedor — quem olha a curva vê que 8
 * subir junto com 4 é o mesmo período contado duas vezes.
 */
export function perfilDeColuna(
  texto: string,
  maximo = 16,
): { n: number; ic: number; encaixe: number }[] {
  const out: { n: number; ic: number; encaixe: number }[] = [];
  for (let n = 1; n <= maximo; n++) {
    const ic = icPorColuna(texto, n);
    out.push({ n, ic, encaixe: (ic - IC_ALEATORIO) / (IC_PORTUGUES - IC_ALEATORIO) });
  }
  return out;
}

export { IC_ALEATORIO, IC_INGLES, IC_PORTUGUES, retratoDoTexto };
