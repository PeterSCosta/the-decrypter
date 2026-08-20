import { defineDecoder } from "../define";
import { coverage, wordsProntas } from "../score";
import { aplicarChave, letrasDe } from "../substituicao";

/**
 * Substituição com o alfabeto DADO — a chave veio na prova, não se quebra nada.
 *
 * ── O BURACO QUE ISTO FECHA ───────────────────────────────────────────────
 * O solver de substituição (`decoders/substituicao.ts`) recusa abaixo de 200
 * letras, e com razão: sem texto suficiente, quebrar por estatística devolve
 * lixo com cara de resposta. Mas prova de gincana raramente entrega 200 letras
 * — e muitas vezes ela **dá a chave** e o trabalho é só aplicar. Entre 22 e 199
 * letras a bancada não tinha nada.
 *
 * ── AS QUATRO FORMAS DE DAR UMA CHAVE ─────────────────────────────────────
 * A prova escreve a chave de dois jeitos, e o segundo tem três variantes que a
 * literatura clássica numera:
 *
 *   **alfabeto inteiro** — 26 letras distintas: a chave É a tabela.
 *   **palavra-chave**    — `LIMOEIRO`, e o alfabeto se constrói a partir dela.
 *
 * Construir a partir da palavra é: escreva a palavra sem repetir letra, depois
 * o resto do alfabeto em ordem. O que muda entre K1, K2 e K3 é **onde** esse
 * alfabeto embaralhado entra:
 *
 *   K1 — embaralhado no CLARO, ordenado no cifrado
 *   K2 — ordenado no claro, embaralhado no CIFRADO
 *   K3 — embaralhado nos dois, com a mesma palavra
 *
 * A bancada tenta as três e deixa passar só a que produz português. Não é
 * palpite entre três: é uma pergunta com três respostas possíveis, e o
 * vocabulário desempata.
 *
 * ── POR QUE NÃO ENTRA SEM CHAVE ───────────────────────────────────────────
 * Sem `ctx.key` não há o que aplicar, e o decoder cala. É o mesmo contrato do
 * `vigenere`, do `beaufort` e do `bifid`, e é o que impede este arquivo de
 * virar mais um gerador de variantes no leque de quem não pediu nada.
 */

const ID = "alfabeto-chave";
const NAME = "Substituição com alfabeto dado";

const AZ = "abcdefghijklmnopqrstuvwxyz";

/**
 * Piso de letras. Abaixo disto o vocabulário não separa acerto de coincidência
 * — é o mesmo motivo do piso do solver, só que aqui o número é menor porque a
 * chave já veio pronta e não há espaço de busca para explodir.
 */
const MIN_LETRAS = 22;
/** O corte de cobertura que o resto da casa usa para dizer "isto se lê". */
const MIN_COBERTURA = 0.45;

/**
 * Palavra-chave → alfabeto de 26 letras.
 *
 * Sem unir I/J, ao contrário do `buildSquare` do Playfair e do `bifidSquare`,
 * que são quadrados de 25 — aqui é substituição simples e o alfabeto é inteiro.
 */
export function alfabetoChaveado(chave: string): string {
  const vistas = new Set<string>();
  let out = "";
  for (const ch of `${chave.toLowerCase()}${AZ}`) {
    if (ch >= "a" && ch <= "z" && !vistas.has(ch)) {
      vistas.add(ch);
      out += ch;
    }
  }
  return out;
}

/** O alfabeto de 26 letras vira o `Uint8Array` que o `aplicarChave` espera. */
const paraMapa = (claro: string, cifrado: string): Uint8Array => {
  const m = new Uint8Array(26);
  for (let i = 0; i < 26; i++) m[cifrado.charCodeAt(i) - 97] = claro.charCodeAt(i) - 97;
  return m;
};

interface Variante {
  rotulo: string;
  mapa: Uint8Array;
}

/** As variantes que a chave admite — uma quando ela é o alfabeto inteiro, três quando é palavra. */
export function variantesDe(chaveBruta: string): Variante[] {
  const chave = chaveBruta.toLowerCase().replace(/[^a-z]/g, "");
  if (chave.length === 0) return [];

  // 26 letras distintas: a chave já É a tabela, e não há o que construir.
  if (chave.length === 26 && new Set(chave).size === 26) {
    return [{ rotulo: "alfabeto dado", mapa: paraMapa(AZ, chave) }];
  }

  const emb = alfabetoChaveado(chave);
  return [
    { rotulo: "K1 (chave no claro)", mapa: paraMapa(emb, AZ) },
    { rotulo: "K2 (chave no cifrado)", mapa: paraMapa(AZ, emb) },
    { rotulo: "K3 (chave nos dois)", mapa: paraMapa(emb, emb) },
  ];
}

export const decoders = defineDecoder({
  id: ID,
  name: NAME,
  category: "classical",
  decode(input, ctx) {
    const texto = input.trim();
    if (letrasDe(texto).length < MIN_LETRAS) return [];

    const variantes = variantesDe(ctx.key ?? "");
    if (variantes.length === 0) return [];

    /**
     * O PORTÃO DE SAÍDA, e ele é o item inteiro.
     *
     * Aplicar uma chave nunca falha — sai texto dos dois lados, certo ou
     * errado. O que separa é o vocabulário: sem o corte de cobertura, o mesmo
     * motor emite para qualquer par texto×chave, e o leque enche de lixo com
     * três rótulos de aparência técnica. Sem vocabulário conferido, cala.
     */
    if (!wordsProntas()) return [];

    return variantes
      .map((v) => {
        const saida = aplicarChave(texto, v.mapa);
        const c = coverage(saida);
        // `covered/analisado` é a razão honesta: `total` conta o token colado
        // inteiro, `analisado` conta o que a segmentação de fato olhou.
        return { v, saida, razao: c.analisado > 0 ? c.covered / c.analisado : 0 };
      })
      .filter((r) => r.razao >= MIN_COBERTURA)
      .sort((a, b) => b.razao - a.razao)
      .slice(0, 2)
      .map((r) => ({
        decoderId: ID,
        decoderName: NAME,
        category: "classical" as const,
        label: r.v.rotulo,
        output: r.saida,
        chainValue: r.saida,
      }));
  },
  encode(input, ctx) {
    const variantes = variantesDe(ctx?.key ?? "");
    if (variantes.length === 0) return input;
    // Cifrar é aplicar o mapa invertido da primeira variante (K1, ou o alfabeto
    // dado quando a chave já tem 26 letras).
    const inverso = new Uint8Array(26);
    for (let i = 0; i < 26; i++) inverso[variantes[0].mapa[i]] = i;
    return aplicarChave(input, inverso);
  },
});
