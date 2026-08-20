import { defineDecoder } from "../define";
import { encodeMorseX } from "../morse-x";
import { POLLUX_PADRAO, cifrarPollux, resolverPollux } from "../pollux-morbit";
import { coverage, maiorPedaco, wordsProntas } from "../score";

/**
 * Pollux — Morse escondido em dígitos, sem a chave.
 *
 * Cada dígito 0–9 vale ponto, traço ou separador; o mapeamento é a chave, e
 * são 3¹⁰ = 59.049. A bancada não pede a chave: ela busca.
 *
 * ── O PORTÃO É O ITEM INTEIRO, E O NÚMERO QUE MANDA É O PISO ─────────────
 * "Só dígitos" rejeita 11% do que a bancada vê — reprova a régua da casa com
 * folga. O espaço numérico daqui é povoado: CEP, plaqueta de poste, geocódigo
 * do IBGE, inscrição imobiliária, telefone, CPF, timestamp e listas de A1Z26
 * coladas de frase. E o problema não é passarem no portão: é **emitirem**.
 * Medido com um piso de 8 dígitos, `88353537` (um CEP de Blumenau) devolve
 * `CETETE` com cobertura 1,00 — resposta errada com nota de resposta certa.
 *
 * O que separa não é o corte de cobertura: é o COMPRIMENTO. Falsos positivos
 * por piso, sobre um corpus de 43 mil entradas reais: piso 8 → 132 · 20 → 23 ·
 * 30 → 2 · 80 → 0. Daí o piso ser alto, e daí ele estar escrito aqui em vez de
 * dissolvido num `if`: quem for afrouxá-lo tem de encontrar este parágrafo.
 *
 * ── E O QUE ISSO CUSTA, DITO ─────────────────────────────────────────────
 * Uma resposta de gincana costuma ser uma palavra, e uma palavra não chega a 80
 * dígitos. Ou seja: no leque, esta cifra só responde onde ela é menos provável.
 * O conserto honesto não é baixar o piso — é o modo "uma cifra só", onde a
 * pessoa já escolheu e a lista ranqueada é a resposta.
 */

const ID = "pollux";
const NAME = "Pollux (Morse em dígitos)";

/**
 * Piso de dígitos no leque. Medido: com 80, zero falsos positivos em 43 mil
 * entradas reais; com 30, dois; com 8, cento e trinta e dois.
 */
const MIN_DIGITOS = 80;
/** E ao menos oito dígitos distintos: menos que isso é sequência, não cifra. */
const MIN_DISTINTOS = 8;

/**
 * Teto de trabalho, em PASSOS — nunca em tempo.
 *
 * Um teto por relógio faria a mesma entrada dar respostas diferentes em duas
 * teclas seguidas, sem nada na tela explicando. Medido: uma cifra real de 103
 * dígitos fecha em 230 mil passos (15 ms); lixo numérico morre em menos de mil.
 */
const ORCAMENTO = 400_000;

/** O corte de "isto se lê" que o resto da casa usa. */
const MIN_COBERTURA = 0.35;
/**
 * E um pedaço reconhecido de verdade, não três letrinhas espalhadas — **só no
 * leque**.
 *
 * Este portão quase custou a resposta certa. Numa cifra de `A PONTE DE FERRO`,
 * a maior palavra é `PONTE`, cinco letras: o corte de 6 a eliminava e deixava
 * passar `ANIMAISXII S AN`, cuja maior palavra tem sete. O filtro que existe
 * para barrar ruído estava, ali, escolhendo o ruído.
 *
 * No leque ele fica, porque lá o inimigo é o falso positivo. No modo "uma cifra
 * só" ele sai: a pessoa já disse qual é a cifra, e o que ela quer é a lista
 * ordenada — não um filtro decidindo por ela qual leitura merece aparecer.
 */
const MIN_MAIOR = 6;

export const decoders = defineDecoder({
  id: ID,
  name: NAME,
  category: "classical",
  decode(input, ctx) {
    const t = input.trim();
    if (!/^\d+$/.test(t)) return [];

    const soMode = ctx.only === ID;
    // No modo "uma cifra só" o piso sai: a pessoa já escolheu, e ali a lista
    // ranqueada é a resposta, não um palpite disputando espaço.
    if (!soMode && (t.length < MIN_DIGITOS || new Set(t).size < MIN_DISTINTOS)) return [];
    if (soMode && t.length < 12) return [];

    // Sem vocabulário conferido não há como ordenar as leituras — e a ordem em
    // que a busca as encontra não tem relação nenhuma com qual é português.
    if (!wordsProntas()) return [];

    const nota = (texto: string) => {
      const c = coverage(texto);
      return c.analisado > 0 ? c.covered / c.analisado : 0;
    };
    const { res, estourou } = resolverPollux(t, ORCAMENTO, nota);

    return res
      .filter(
        (s) => nota(s.texto) >= MIN_COBERTURA && (soMode || maiorPedaco(s.texto) >= MIN_MAIOR),
      )
      .slice(0, soMode ? 5 : 2)
      .map((s) => ({
        decoderId: ID,
        decoderName: NAME,
        category: "classical" as const,
        label: `mapa ${Object.entries(s.mapa)
          .map(([d, v]) => `${d}${v}`)
          .join(" ")}`,
        // A busca cortada precisa dizer que foi cortada: sem isso, "não achei"
        // e "parei antes de procurar tudo" viram o mesmo silêncio.
        notes: estourou
          ? "busca cortada no teto de trabalho — pode haver leitura melhor"
          : undefined,
        output: s.texto,
        chainValue: s.texto,
      }));
  },
  encode(input) {
    return cifrarPollux(encodeMorseX(input), POLLUX_PADRAO);
  },
});
