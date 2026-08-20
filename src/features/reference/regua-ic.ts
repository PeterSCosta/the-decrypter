import { IC_ALEATORIO, IC_INGLES, IC_PORTUGUES } from "@/features/decoder/engine/criptanalise";
import { MIN_LETRAS_VEREDITO } from "@/features/retrato/leitura";

/**
 * A RÉGUA DO ÍNDICE DE COINCIDÊNCIA — a legenda da aba Retrato.
 *
 * ── POR QUE ELA EXISTE ─────────────────────────────────────────────────────
 * Sem ela o Retrato mostra números que ninguém interpreta. "IC 0,0443" não diz
 * nada a quem chega às 23h com uma prova na mão; "0,0443 é quase aleatório, e
 * quase aleatório com uma coluna que sobe é Vigenère" diz tudo.
 *
 * ── E POR QUE OS NÚMEROS SÃO IMPORTADOS, NÃO ESCRITOS ──────────────────────
 * Todos vêm de `criptanalise.ts` e de `retrato/leitura.ts`. Se alguém recalibrar
 * o motor, a Cola muda junto — em vez de virar a terceira versão do mesmo
 * número, discordando das outras duas em silêncio. Este repositório já teve
 * documento afirmando precisão que o código não entregava; a saída foi parar de
 * escrever número à mão.
 */

export interface FaixaIC {
  faixa: string;
  ic: string;
  significa: string;
  ondeOlhar: string;
}

export const REGUA_IC: FaixaIC[] = [
  {
    faixa: "natural, com perfil de idioma",
    ic: `≈ ${IC_PORTUGUES.toFixed(4)} (pt) · ${IC_INGLES.toFixed(4)} (en)`,
    significa: "Texto em claro.",
    ondeOlhar:
      "Se devia estar cifrado, a mensagem está DENTRO dele: acróstico, letra por posição, contagem por linha, primeira letra de cada item.",
  },
  {
    faixa: "natural, sem perfil de idioma",
    ic: `≈ ${IC_PORTUGUES.toFixed(4)}`,
    significa: "Substituição monoalfabética.",
    ondeOlhar:
      "César, Atbash, disco cifrante, substituição livre. Trocar o alfabeto não mexe no IC — só no perfil. O solver resolve a partir de 200 letras.",
  },
  {
    faixa: "quase aleatório, MAS uma coluna sobe",
    ic: `entre ${IC_ALEATORIO.toFixed(4)} e ${IC_PORTUGUES.toFixed(4)}`,
    significa: "Polialfabética — e a coluna que sobe é o comprimento da chave.",
    ondeOlhar:
      "Vigenère, Beaufort, Porta, autokey. Fatiado no comprimento certo, cada coluna vira um César puro e recupera o IC do idioma.",
  },
  {
    faixa: "aleatório, e nenhuma coluna sobe",
    ic: `≈ ${IC_ALEATORIO.toFixed(4)} (= 1/26)`,
    significa: "Não é texto cifrado por substituição.",
    ondeOlhar:
      "Codificação (Base64, hex, Base32), dado binário, ou texto de outro alfabeto. A faixa de dicas do Decodificador diz qual.",
  },
];

/**
 * As duas armadilhas do IC, e elas são a razão de a régua não ser uma linha só.
 *
 * A primeira derrubou a primeira versão da leitura do Retrato: a versão original
 * separava polialfabética de ruído por um corte de IC global, e **isso não
 * funciona** — medido, o encaixe de um Vigenère de chave 12 é 7% contra 3% do
 * ruído. Não há corte que separe; quem separa é a coluna.
 */
export const REGUA_IC_NOTAS: string[] = [
  "**Transposição não muda o IC.** Embaralhar a ordem das letras preserva a distribuição inteira: um scytale tem IC de português. Se o IC é natural e o texto não se lê, é substituição OU transposição — e quem distingue as duas é a existência de palavra real na saída, não a estatística.",
  "**Chave longa aproxima do ruído.** Um Vigenère de chave 12 tem encaixe de 7%, e o ruído aleatório, 3%. Nenhum corte de IC global separa os dois; por isso o Retrato decide pelo IC **por coluna**, que é 1,29 no Vigenère e 0,17 no ruído.",
  `**Abaixo de ${MIN_LETRAS_VEREDITO} letras não há veredito.** Medido na distribuição dos dois idiomas: em 60 letras um texto cifrado às vezes casa com o perfil melhor que um texto real. A bancada mostra os números e se recusa a concluir.`,
  "**O múltiplo também acende.** Uma chave de 3 faz as colunas 3, 6, 9 e 12 subirem. O menor que sobe é o comprimento; os outros são o mesmo período contado de novo.",
];
