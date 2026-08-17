import { PARECE_ESTRUTURA, achaPonte } from "@/features/bridge/match";
import { TIPO_LABEL } from "@/features/bridge/types";
import type { DecodeCandidate, DecodeContext, Decoder } from "../types";

/**
 * Nome de ponte, passarela ou viaduto → a estrutura.
 *
 * As 94 linhas já estavam na bancada, mas só a Triangulação as consultava: o
 * Decodificador nunca perguntava, então "Passarela Rodolpho Kern" caía nas
 * cifras genéricas e a lei que a nomeou — que costuma ser a pista — não
 * aparecia em lugar nenhum.
 *
 * A base é LOCAL (86 KB, carregada quando a entrada tem cara de estrutura), ao
 * contrário de poste e CEP: são 94 linhas, e mandá-las ao servidor custaria um
 * RTT para responder o que cabe na memória.
 */
function confianca(forca: "exato" | "contido", nome: string): number {
  // Nome inteiro: praticamente não casa por acaso — 0,95, acima do card de rua.
  if (forca === "exato") return 0.95;
  // Parte do nome. "Ponte de Ferro" discrimina; "ponte" está em 60 das 94
  // linhas e casaria com qualquer uma — o comprimento é o que separa os dois.
  return nome.length >= 12 ? 0.82 : 0.6;
}

const bridge: Decoder = {
  id: "bridge",
  name: "Ponte / passarela (Blumenau)",
  category: "lookup",
  decode(input: string, ctx: DecodeContext): DecodeCandidate[] {
    const texto = input.trim();
    if (!PARECE_ESTRUTURA.test(texto)) return [];
    const base = ctx.bridges;
    if (!base) return [];

    const acerto = achaPonte(texto, base.rows);
    if (!acerto) return [];
    const p = acerto.ponte;

    const tipo = TIPO_LABEL[p.tipo] ?? "Estrutura";
    const onde = p.transpoe.length
      ? `transpõe ${p.transpoe.join(", ")}`
      : (p.cursoDaguaLei ?? p.via ?? p.bairros[0] ?? "");

    return [
      {
        decoderId: "bridge",
        decoderName: "Ponte / passarela (Blumenau)",
        category: "lookup",
        label: p.lei ? `Lei ${p.lei}` : p.fonte === "osm" ? "OpenStreetMap" : "Câmara Municipal",
        // O nome entra na saída porque o motor deduplica por texto exato: um
        // "transpõe o Ribeirão da Velha" solto colidiria com outra estrutura.
        output: `${tipo} ${p.nome}${onde ? ` — ${onde}` : ""}`,
        forcedScore: confianca(acerto.forca, normalizaNome(texto)),
        render: "ponte",
        data: p,
        // Sem geometria não há o que encadear: `chainValue` vira a coordenada
        // só quando ela existe, senão o botão "usar como entrada" apareceria
        // prometendo um ponto que a linha não tem.
        ...(p.lat != null && p.lng != null ? { chainValue: `${p.lat}, ${p.lng}` } : {}),
      },
    ];
  },
};

/** O comprimento que importa para a confiança é o do texto casado, sem ruído. */
function normalizaNome(s: string): string {
  return s.trim();
}

export const decoders = [bridge];
