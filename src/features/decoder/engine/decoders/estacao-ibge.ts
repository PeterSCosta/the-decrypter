import { type Estacao, porChapa, porCodigo, rotuloTipo } from "@/features/estacao/types";
import { defineDecoder } from "../define";
import type { LocationData } from "./location";

/**
 * Estação geodésica do IBGE → a chapa no mapa.
 *
 * ── POR QUE ISTO É "DE GINCANA" ─────────────────────────────────────────────
 * É a mesma forma da GIA-25: objeto físico numerado em lugar público. Só que
 * aqui a descrição do cadastro costuma ser enunciado pronto — "chapa cravada
 * na cabeceira da ponte de concreto sobre o Rio Perequê".
 *
 * ── ASSINATURA: NENHUMA, E POR ISSO É PRÉ-RESOLVIDO ─────────────────────────
 * `1400M` é dígitos e uma letra — a forma de qualquer coisa. O decoder não
 * emite por forma: emite quando o código EXISTE na base do Vale. E ainda assim
 * fica com nota moderada, porque a coincidência é possível.
 */

/**
 * O nome só vale quando DIZ alguma coisa. Em boa parte da base o `nomeEstacao`
 * repete o código (`8121288` chama-se "8121288"), e `8121288 (8121288)` é ruído
 * com cara de informação.
 */
const nomeUtil = (e: Estacao) =>
  e.nome && e.nome.toUpperCase() !== e.codigo.toUpperCase() ? e.nome : "";

export const decoders = defineDecoder({
  id: "estacao-ibge",
  name: "Estação geodésica (IBGE)",
  category: "lookup",
  decode(input, ctx) {
    const t = input.trim();
    /**
     * Portão barato antes de varrer a base — e ele estava CURTO em dois eixos.
     *
     * No comprimento: aceitava no máximo 4 dígitos, e a base do Vale tem 226
     * códigos de 7 (`8121288`) e 19 de 5 (`11053`). Passavam 246 das 491
     * linhas (50,1%) — metade da base era inalcançável numa capacidade que a
     * bancada anuncia.
     *
     * Na FORMA: só existia a do código. A chapa é o que está gravado no bronze
     * (`MR-103`, `RN2004H`, `EP-SG-22-1048`) e não se parece nada com aquilo,
     * então esses textos nunca chegavam à busca — caíam em `caesar-bruteforce`
     * a 0,40. A segunda porta existia em `porChapa()` e **nunca abria**.
     *
     * Alargar não afrouxa nada, e as colisões são de propósito: `SG-22` casa a
     * forma da chapa e é uma carta topográfica. Não importa — quem decide é a
     * base, e uma carta não está no índice de chapas.
     */
    const formaCodigo = /^[A-Za-z]?\d{1,7}[A-Za-z]?$/.test(t);
    // O hífen é OPCIONAL, e essa letra miúda já custou uma vez: `MR-103` tem,
    // `RN2004H` e `SAT94026` não têm, e são inscrições da mesma base. Exigir o
    // hífen barrava justamente as que vieram da descrição.
    //
    // O dígito, sim, é obrigatório — é o mesmo discriminante que o
    // `build:estacoes` usa para separar inscrição de nome gravado, e é o que
    // impede prosa (`casarao`, `pontes`) de varrer 491 linhas a cada tecla.
    const formaChapa = /^[A-Za-z]{2,3}-?[A-Za-z0-9-]{2,20}$/.test(t) && /\d/.test(t);
    if (!formaCodigo && !formaChapa) return [];

    // Duas portas: o código gravado e a INSCRIÇÃO da chapa (Onda 5.2). A
    // segunda tem cobertura fina — 70 das 491 —, e é por isso que ela vem
    // depois: quem tem código acha pelo código.
    const achados = formaCodigo ? porCodigo(ctx.estacoes ?? null, t) : [];
    const todos = achados.length ? achados : porChapa(ctx.estacoes ?? null, t);
    if (!todos.length) return [];
    // Qual porta abriu MUDA O QUE MOSTRAR: quem digitou `MR-103` e recebe
    // "99861 — Blumenau" não tem como saber por que aquilo apareceu.
    const viaChapa = achados.length === 0;

    return todos.slice(0, 3).map((e: Estacao) => {
      const data: LocationData = {
        lat: e.lat,
        lng: e.lng,
        label: nomeUtil(e)
          ? `${nomeUtil(e)} — ${e.municipio}`
          : `Estação ${e.codigo} — ${e.municipio}`,
        // O itinerário é o campo mais próximo de um enunciado de prova que esta
        // base tem ("Partir da frente da Igreja Matriz…") — quando vem, vem na
        // frente da descrição física.
        detail: [
          rotuloTipo(e.tipo, e.tema),
          e.situacao,
          e.localizacao,
          e.itinerario || e.descricao,
          e.altitude ? `altitude ${e.altitude} m` : "",
          e.chapa ? `chapa ${e.chapa}` : "",
          // ── Onda 5.9, a metade que vale hoje ──
          // De quando é a base. O BDG é atualizado pelo IBGE e a nossa cópia
          // envelhece EM SILÊNCIO: uma estação destruída ou recadastrada
          // continua aqui com a mesma cara de dado corrente. É a mesma ressalva
          // que o card de folha cartográfica já carrega — e pela mesma razão.
          ctx.estacoes?.generatedAt ? `BDG/IBGE, cópia de ${ctx.estacoes.generatedAt}` : "",
        ]
          .filter(Boolean)
          .join(" · "),
        format: "Estação geodésica (IBGE)",
      };
      return {
        decoderId: "estacao-ibge",
        decoderName: "Estação geodésica (IBGE)",
        category: "lookup" as const,
        label: viaChapa
          ? `chapa ${t.toUpperCase()} · ${e.municipio}`
          : `${e.codigo} · ${e.municipio}`,
        output: `${viaChapa ? `chapa ${e.chapa} → ` : ""}${e.codigo}${nomeUtil(e) ? ` (${nomeUtil(e)})` : ""} — ${e.municipio} · ${e.descricao || rotuloTipo(e.tipo, e.tema)}`,
        forcedScore: 0.6,
        render: "map" as const,
        chainValue: `${e.lat}, ${e.lng}`,
        data,
      };
    });
  },
});
