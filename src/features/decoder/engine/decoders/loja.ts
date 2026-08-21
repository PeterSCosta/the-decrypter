import { type Loja, porFormaNua, porIdentificador } from "@/features/loja/types";
import { defineDecoder } from "../define";

/**
 * Número da unidade → loja do shopping.
 *
 * ── ELE NÃO ACRESCENTA RUÍDO A UM SILÊNCIO: ELE SUBSTITUI LIXO ──────────────
 * Rodei os 119 identificadores do catálogo contra a bancada real, antes de
 * escrever uma linha. **113 deles (95,0%) já recebem hoje uma resposta ERRADA
 * acima do corte de 0,35**:
 *
 *   L2016B/17  → caesar-bruteforce 0,40   (uma tabela de 53 linhas)
 *   L1055      → leetspeak 0,59           ("Lioss")
 *   T2012      → location 0,52            (−26.98219, −48.98802)
 *   L2051/52/53→ ncm 0,55                 ("Pode ser um NCM: 2051.52.53")
 *   Sala       → affine 0,56              ("Aoro")
 *
 * A recusa que eu mesmo escrevi na varredura de Blumenau valia para a forma
 * NUA. Medido na forma COMPLETA, a colisão com código de rua e número de lei é
 * de **5 em 119 = 4,2%**, e 95,0% dos identificadores carregam prefixo de letra
 * — assinatura de verdade.
 *
 * ── DUAS PORTAS, DUAS NOTAS, E A RAZÃO DA SEGUNDA ───────────────────────────
 * A porta COMPLETA (`L2032`, `A13`, `Loja 15`) entra a **0,88**: é acerto exato
 * numa base de 117 identificadores distintos, e o card diz coisa que a entrada
 * não dizia — loja, piso e ala.
 *
 * A porta NUA (`2024`, `2078`, `1033`, `1104`, `1117` — os cinco identificadores
 * que já são dígito puro) entra a **0,45**, e isso é o item central do desenho.
 * Das 118 formas nuas do catálogo, **99 (83,9%) já são código de rua ou número
 * de lei**, e `street-code` responde a elas **corretamente**, a 0,97. `2024` é
 * ao mesmo tempo o LUC da Mistura Brasileira e o código da R Carl Kaun. Um card
 * de loja acima disso empurraria uma resposta certa para baixo — que é
 * exatamente o defeito pelo qual o decoder de assento foi recusado. Então ele
 * entra visível (acima de 0,35) e embaixo.
 *
 * ── O QUE ELE NÃO FAZ ───────────────────────────────────────────────────────
 * Não busca por NOME. Dos 372 nomes de loja do catálogo, **41 (11,0%) são
 * palavra do dicionário** — `claro`, `vivo`, `farm`, `hope`, `maze`, `tomato`,
 * `subway`, `natura` —, e uma porta por nome acenderia em prosa comum. Busca
 * por nome vive na Biblioteca, onde quem pergunta já escolheu o contexto.
 */

export interface LojaHint {
  consulta: string;
  achados: Loja[];
  /** `true` quando o acerto veio pelos dígitos, sem o prefixo de letra. */
  porNumeroSolto: boolean;
  aviso: string;
}

/**
 * A forma que faz a base descer e o card emitir.
 *
 * Aceita `L2032`, `A13`, `Q28`, `SPESS02`, `T2044/45`, `L2036/2037/2038`,
 * `Loja 16-A`, `Sala 401-402`, `Loja Serv. 03` e o dígito puro de 3 a 6 casas.
 * Não aceita texto: nome de loja não entra por aqui, de propósito.
 */
export const PARECE_UNIDADE =
  /^(?:(?:lojas?|salas?|quiosque)\s*(?:serv\.?\s*)?)?[a-z]{0,5}\s?\d{1,6}[a-z]?(?:[/-]\d{1,4}[a-z]?)*$/i;

export const decoders = defineDecoder({
  id: "loja-blumenau",
  name: "Loja de shopping (Blumenau)",
  category: "lookup",
  decode(input, ctx) {
    const t = input.trim();
    if (!t || !PARECE_UNIDADE.test(t)) return [];

    // A NOTA SEGUE A ENTRADA, NÃO A PORTA — e este teste foi escrito antes do
    // código, e reprovou a primeira versão. `2024` É um identificador completo
    // do catálogo (o LUC da Mistura Brasileira), então ele casa na porta 1 e a
    // versão anterior lhe dava 0,88. Mas quem digitou `2024` não digitou
    // assinatura nenhuma: aquele número também é o código da R Carl Kaun, e a
    // leitura de rua está CERTA. O que decide a nota é a entrada carregar ou não
    // o prefixo de letra que o shopping publica.
    const semAssinatura = /^\d{3,6}$/.test(t);

    // Porta 1: a forma completa, com o prefixo que o shopping publica.
    // Porta 2: só os dígitos, para quem digitou `2032` querendo `L2032`.
    const achados = porIdentificador(ctx.lojas ?? null, t);
    const todos = achados.length ? achados : semAssinatura ? porFormaNua(ctx.lojas ?? null, t) : [];
    if (!todos.length) return [];

    const onde = (l: Loja) => [l.piso, l.ala].filter(Boolean).join(" · ") || l.shopping.nome;
    const texto = todos.map((l) => `${l.nome} — ${l.shopping.nome}, ${onde(l)}`).join(" · ");

    return [
      {
        decoderId: "loja-blumenau",
        decoderName: "Loja de shopping (Blumenau)",
        category: "lookup" as const,
        label: semAssinatura ? `unidade ${t} (número solto)` : `unidade ${t}`,
        // O identificador entra no `output` porque o motor deduplica por texto
        // dobrado: sem ele, duas unidades homônimas colapsariam numa.
        output: `${t} — ${texto}`,
        forcedScore: semAssinatura ? 0.45 : 0.88,
        render: "loja" as const,
        // Encadeia o NOME da loja, que é o próximo elo da prova real
        // (loja → CNPJ → razão social → letra). Nunca o identificador:
        // repetir a entrada é o que reprovou o decoder de assento.
        chainValue: todos[0].nome,
        data: {
          consulta: t,
          achados: todos,
          porNumeroSolto: semAssinatura,
          aviso: ctx.lojas?.aviso ?? "",
        } satisfies LojaHint,
      },
    ];
  },
});
