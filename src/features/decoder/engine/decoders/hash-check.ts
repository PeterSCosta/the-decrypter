import { ALGORITMOS } from "@/lib/hashes";
import { defineDecoder } from "../define";

/**
 * CONFERIR HASH — a única família desta bancada com risco ZERO de resposta errada.
 *
 * ── O QUE ELA FAZ ──────────────────────────────────────────────────────────
 * A prova dá um hash. Você digita o candidato no campo principal, cola o hash no
 * 2º campo, e a bancada diz **bate ou não bate**. Não há nota, não há palpite,
 * não há ordenação por evidência — há sim ou não.
 *
 * ── POR QUE ELE NÃO É UM DECODER DE FAN-OUT ────────────────────────────────
 * Porque não decodifica nada. Sem o hash no 2º campo ele não emite, e é isso que
 * o mantém fora do caminho: a bancada roda os 126 decoders a cada tecla, e um
 * que hasheasse toda entrada gastaria por nada. O `hash-id`, que já existe,
 * continua fazendo a outra metade — dizer que uma string *parece* um hash.
 *
 * ── E POR QUE O ALGORITMO NÃO É ESCOLHIDO PELA PESSOA ──────────────────────
 * O comprimento em hex determina a família: 8 é CRC-32, 32 é MD5, 40 é SHA-1, 64
 * é SHA-256. Pedir para escolher seria pedir que ela soubesse o que está tentando
 * descobrir. A bancada testa o que couber no comprimento e responde.
 *
 * ── O QUE ELE **NÃO** FAZ, E É DE PROPÓSITO ────────────────────────────────
 * Não quebra hash por força bruta. Isso é busca, e busca não entra no leque
 * síncrono — é o item 6.2, que precisa de Worker.
 */

const ID = "hash-check";
const NAME = "Conferir hash";

/** Um hash é hex puro; qualquer outra coisa no 2º campo não é para nós. */
const SO_HEX = /^[0-9a-f]+$/i;

export const decoders = defineDecoder({
  id: ID,
  name: NAME,
  category: "transform",
  inputs: {
    aux: {
      label: "Hash a conferir",
      placeholder: "cole aqui o MD5, SHA-1, SHA-256 ou CRC-32 da prova",
    },
  },
  decode(input, ctx) {
    const alvo = (ctx.aux ?? "").trim().toLowerCase();
    if (!alvo || !SO_HEX.test(alvo)) return [];

    const candidato = input;
    if (!candidato) return [];

    // O comprimento escolhe a família — ver o bloco do cabeçalho.
    const possiveis = ALGORITMOS.filter((a) => a.hex === alvo.length);
    if (possiveis.length === 0) {
      return [
        {
          decoderId: ID,
          decoderName: NAME,
          category: "transform" as const,
          label: `${alvo.length} hex`,
          output: `Não reconheço um hash de ${alvo.length} caracteres hex. Conheço CRC-32 (8), MD5 (32), SHA-1 (40) e SHA-256 (64).`,
          forcedScore: 0.4,
        },
      ];
    }

    for (const alg of possiveis) {
      if (alg.fn(candidato) === alvo) {
        return [
          {
            decoderId: ID,
            decoderName: NAME,
            category: "transform" as const,
            label: `${alg.nome} · BATE`,
            output: `${alg.nome} de "${candidato}" é exatamente o hash informado.`,
            // O teto da bancada: não é palpite, é igualdade. Nada aqui é mais
            // certo que isto.
            forcedScore: 0.99,
            chainValue: candidato,
          },
        ];
      }
    }

    const nomes = possiveis.map((a) => a.nome).join(" / ");
    return [
      {
        decoderId: ID,
        decoderName: NAME,
        category: "transform" as const,
        label: `${nomes} · não bate`,
        output: `O ${nomes} deste texto é ${possiveis[0].fn(candidato)}, e não o hash informado.`,
        // Resposta negativa é resposta: mostra o hash calculado para a pessoa
        // comparar caractere a caractere, em vez de só dizer "não".
        forcedScore: 0.5,
      },
    ];
  },
});
