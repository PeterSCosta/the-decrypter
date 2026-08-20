import { type Filme, tituloPrincipal } from "@/features/filme/types";
import { defineDecoder } from "../define";

/**
 * ID da IMDb → ficha do filme, pelo Wikidata.
 *
 * ── A ASSINATURA É FORTE, E A CONFIRMAÇÃO AINDA É OBRIGATÓRIA ──────────────
 * `tt` seguido de 7 ou 8 dígitos é forma fechada: medida contra o acervo de
 * provas, a rejeição é de 100,000% — nenhum token de lá tem esse desenho. Mesmo
 * assim o decoder **não emite pela forma**: emite quando a consulta confirma.
 * A forma diz o que perguntar; quem responde é a fonte.
 *
 * ── O SILÊNCIO TEM DE DIZER QUAL SILÊNCIO É ────────────────────────────────
 * Três estados diferentes, e confundi-los é o defeito:
 *
 *   achou            → card com a ficha
 *   perguntou e não  → "não consegui confirmar este ID", NUNCA "não existe"
 *   não perguntou    → a faixa de dicas já avisa que a consulta está fora
 *
 * O segundo caso é o comum: o Wikidata cobre uma fração do catálogo da IMDb.
 * Dizer "esse filme não existe" a partir daí seria afirmar a partir de uma
 * ausência — e ausência de evidência não é evidência de ausência.
 *
 * ── E O TÍTULO ─────────────────────────────────────────────────────────────
 * Ver `features/filme/types.ts`: o card mostra o título brasileiro quando a
 * fonte tem, e quando não tem **diz que não tem**, em vez de oferecer o
 * original ou o de Portugal como se fossem.
 */

const ID = "imdb";
const NAME = "Filme (IMDb)";

/** `tt` e 7 ou 8 dígitos — a mesma forma que o servidor confere em `ImdbId`. */
export const PARECE_IMDB = /^tt\d{7,8}$/i;

/**
 * `Q` e dígitos — o código do MESMO filme no catálogo do Wikidata.
 *
 * ── POR QUE ELE É UMA SEGUNDA PORTA ───────────────────────────────────────
 * `Q4941` é Skyfall, igual ao `tt1074638`; é o que se copia de uma página do
 * Wikidata. Sem esta porta a bancada lia `Q4941` como **cauda de Geohash** e
 * devolvia cinco pontos em Blumenau — medido, 61% dos QIDs fazem isso — sem
 * nunca dizer que aquilo era um filme.
 *
 * As duas leituras continuam na tela. O que muda é a ordem, e a razão está na
 * régua da casa: a cauda vale 0,52 porque é palpite entre cinco, todas
 * assumindo um prefixo de cidade; um acerto exato numa base real é evidência
 * de outra natureza.
 *
 * ── E ISTO NÃO CONTRADIZ A REGRA DO QID ───────────────────────────────────
 * A regra escrita é que o QID nunca vira valor clicável, encadeável ou
 * copiável — ela é sobre o QID como SAÍDA, porque encadeá-lo joga a volta
 * seguinte na leitura de coordenada. Como ENTRADA ele é chave legítima, e
 * resolvê-lo é o oposto de propagar o engano: é encerrá-lo.
 */
export const PARECE_QID = /^Q[1-9]\d{0,10}$/i;

/**
 * As TRÊS espécies de código do Wikidata — e nem todas são coisa.
 *
 *   `Q2`    item        a Terra
 *   `P345`  propriedade o CAMPO "identificador IMDb"
 *   `L1`    lexema      a PALAVRA "ama", em sumério
 *
 * As três são acerto exato: um código aponta para um registro e só um. É o
 * oposto do problema que manteve a busca por nome fechada — "Maria" devolve
 * 113 candidatos, `L1` devolve `L1`.
 */
export const PARECE_CODIGO_WD = /^[QPL][1-9]\d{0,10}$/i;

export const decoders = defineDecoder({
  id: ID,
  name: NAME,
  category: "lookup",
  decode(input, ctx) {
    const t = input.trim();
    const porQid = PARECE_QID.test(t);
    if (!PARECE_IMDB.test(t) && !porQid) return [];
    // A resposta precisa ser DESTA entrada: um acerto de duas teclas atrás
    // apareceria como se fosse deste texto.
    if (ctx.hits?.q !== t) return [];

    const f = ctx.hits.filme as Filme | null | undefined;
    if (!f) {
      /**
       * Perguntamos e a fonte não confirmou. Isso é informação — e é diferente
       * de "o filme não existe".
       *
       * Pela porta do QID o silêncio é COMPLETO, de propósito: um `Q…` não
       * promete ser filme (`Q42` é Douglas Adams), então dizer "não confirmei
       * o filme" para todo número Q seria ruído — e a leitura de Geohash, que
       * continua na tela, é a resposta honesta ali.
       */
      if (porQid) return [];
      return [
        {
          decoderId: ID,
          decoderName: NAME,
          category: "lookup" as const,
          label: `${t.toLowerCase()} · não confirmado`,
          output: `${t.toLowerCase()} — tem forma de ID da IMDb, mas o Wikidata não conhece este ID. Isso não quer dizer que o filme não exista: a fonte cobre só parte do catálogo.`,
          forcedScore: 0.36,
          chainValue: "",
        },
      ];
    }

    const titulo = tituloPrincipal(f);
    // O SEGUNDO título entra na própria linha do resultado, e não só na ficha:
    // é o que aparece na lista, no que se copia e no que se encadeia. Um filme
    // que se chama diferente aqui e lá fora tem dois nomes, e a prova pode citar
    // qualquer um dos dois.
    const outro = [f.tituloOriginal, f.tituloIngles].find((x) => x && x !== titulo.texto);
    const partes = [
      titulo.texto,
      outro ? `/ ${outro}` : "",
      f.ano ? `(${f.ano})` : "",
      f.duracaoMin ? `· ${f.duracaoMin} min` : "",
      f.direcao?.length ? `· dir. ${f.direcao.join(", ")}` : "",
    ].filter(Boolean);

    return [
      {
        decoderId: ID,
        decoderName: NAME,
        category: "lookup" as const,
        // Entrando pelo QID, o rótulo diz de onde veio: quem colou um `Q…`
        // precisa ver que a bancada o reconheceu como filme, e não como cauda.
        label: `${porQid ? `${t.toUpperCase()} → ` : ""}${titulo.texto}${f.ano ? ` (${f.ano})` : ""}`,
        output: partes.join(" "),
        // Acerto confirmado numa fonte externa, com assinatura de forma fechada.
        forcedScore: 0.88,
        render: "filme" as const,
        // Encadeia o TÍTULO, que é o que vira entrada de outra cifra (anagrama,
        // acróstico, contagem de letras). O QID do Wikidata **jamais** encadeia:
        // medido em 2.000 QIDs sorteados, 61,0% deles são lidos como coordenada
        // pela própria bancada — `Q220741` devolve três leituras de Geohash no
        // litoral de SC antes de qualquer outra coisa.
        chainValue: titulo.texto,
        data: f,
      },
    ];
  },
});
