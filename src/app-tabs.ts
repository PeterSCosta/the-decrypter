import type { RotaAba } from "@/lib/rota";
import {
  BarChart3,
  BookOpen,
  Compass,
  Eye,
  FileSearch,
  GitCompare,
  Grid3x3,
  Hash,
  Library,
  Lightbulb,
  ListChecks,
  MapPinned,
  Shuffle,
  Triangle,
  Type,
  Wand2,
} from "lucide-react";
import type { ComponentType } from "react";

/**
 * A lista de abas é a MESMA coisa que a lista de rotas — de propósito.
 *
 * Se fossem dois tipos separados, acrescentar uma aba e esquecer o apelido de
 * URL compilaria, e o link daquela tela levaria para o Decodificador em
 * silêncio. Sendo o mesmo tipo, o `Record<RotaAba, string>` de `lib/rota.ts`
 * transforma o esquecimento em ERRO DE COMPILAÇÃO — que é onde este tipo de
 * defeito custa menos.
 */
export type TabId = RotaAba;

/**
 * ── POR QUE `Record`, E NÃO UM ARRAY DE OBJETOS ────────────────────────────
 * Pela mesma razão de acima, um nível adiante. Enquanto isto era um array
 * literal, uma aba podia existir na união `RotaAba` e no mapa de apelidos e
 * **ficar fora daqui**: compilava, passava em todos os testes, e simplesmente
 * não aparecia em nenhuma das duas navegações. Com `Record<TabId, …>` o
 * esquecimento é um erro do compilador.
 *
 * A ORDEM fica separada porque `Record` não a garante — e a ordem é decisão de
 * produto, comentada item a item em `ORDEM`.
 */
export const TABS: Record<TabId, { label: string; icon: ComponentType<{ className?: string }> }> = {
  decoder: { label: "Decodificador", icon: Wand2 },
  arquivo: { label: "Arquivo", icon: FileSearch },
  lote: { label: "Lote", icon: ListChecks },
  text: { label: "Texto", icon: Type },
  positions: { label: "Posições", icon: Hash },
  matrix: { label: "Matriz", icon: Grid3x3 },
  diff: { label: "Diferenças", icon: GitCompare },
  anagram: { label: "Anagramas", icon: Shuffle },
  fonts: { label: "Fontes", icon: Eye },
  reference: { label: "Cola", icon: BookOpen },
  retrato: { label: "Retrato", icon: BarChart3 },
  geo: { label: "Geolocalização", icon: Compass },
  triangulate: { label: "Triangulação", icon: Triangle },
  postes: { label: "Postes", icon: Lightbulb },
  library: { label: "Biblioteca", icon: Library },
  fleet: { label: "Frota", icon: MapPinned },
};

export const ORDEM: TabId[] = [
  "decoder",
  // Logo depois do Decodificador: é a segunda porta de entrada mais provável
  // quando a prova chega, porque a primeira pergunta sobre um arquivo é "o que
  // é isto de verdade" — e essa se responde nos bytes, antes de saber o tipo.
  "arquivo",
  // O Lote é a bancada no plural, e vem colado a ela: quem colou uma lista no
  // Decodificador recebe um chip mandando para cá, e o caminho tem de ser curto.
  "lote",
  "text",
  "positions",
  "matrix",
  "diff",
  "anagram",
  "fonts",
  "reference",
  // Depois da Cola e antes da Geolocalização: o Retrato responde "que cifra é
  // esta", que é a pergunta ANTERIOR a decifrar — e quem não sabe a resposta
  // chega nele vindo da Cola, não do Decodificador.
  "retrato",
  // Antes da Triangulação: ela é a porta do assunto (o que é cada formato, o
  // que fazer com um código pela metade), e a Triangulação é uma ferramenta
  // específica de dentro dele.
  "geo",
  "triangulate",
  "postes",
  "library",
  "fleet",
];
