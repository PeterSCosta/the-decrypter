import { type Divisao, dividirEmItens, dividirPorVirgula } from "@/lib/linhas";
import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { assinar, emAndamento, escrever, ler, parar, rodar } from "./estado";
import { resumir } from "./resumo";
import { CAMPOS, type Campo, type CampoId, type EstadoItem } from "./tipos";

/** O que a coluna copiável escreve quando o item não tem resposta. */
const SEM_RESPOSTA = "?";

/**
 * O valor de um campo — e a recusa de ESCOLHER entre candidatos.
 *
 * Antes isto devolvia o primeiro acerto não-vazio, e aí estava o pior defeito
 * que a revisão achou. `41101634` é um número de lote de Blumenau sem hífens, e
 * a própria API documenta que ele admite mais de um agrupamento real
 * (`4-1-10-16-34` ou `4-1-10-1-634`): a resposta vem com DOIS endereços. A
 * linha da lista mostrava os dois, honestamente — e a coluna copiável, que é o
 * que vai para a folha da prova, saía com um só, sem marca nenhuma. O mesmo
 * valia para `cepsPrefixo` (2.271 sufixos de seis dígitos existem com 88 e com
 * 89) e para a lista de sugestões da CID.
 *
 * Quem escolhe é quem digitou, olhando os candidatos — não a bancada, no
 * escuro. Com mais de um valor distinto, o campo devolve um marcador que grita.
 */
function valorDoCampo(estado: EstadoItem | undefined, campo: CampoId): string | null {
  if (estado?.tipo !== "resolvido") return null;
  const distintos = [...new Set(estado.acertos.map((a) => a.campos[campo]).filter(Boolean))];
  if (distintos.length === 0) return null;
  if (distintos.length > 1) return `? ${distintos.length} candidatos`;
  return distintos[0] as string;
}

export function useLote() {
  const [campo, setCampo] = useState<CampoId>("principal");
  const [marcarVazias, setMarcarVazias] = useState(true);

  const lote = useSyncExternalStore(assinar, ler);
  const texto = lote.texto;
  const setTexto = escrever;
  const previa: Divisao = useMemo(() => dividirEmItens(texto), [texto]);

  const estadosNaOrdem = useMemo(
    () => lote.itens.map((i) => lote.estados.get(i.termo) ?? { tipo: "fila" as const }),
    [lote.itens, lote.estados],
  );
  const resumo = useMemo(() => resumir(estadosNaOrdem), [estadosNaOrdem]);

  /**
   * Só os campos que ALGUMA base de fato preencheu.
   *
   * Oferecer "bairro" numa rodada de aeroportos produziria uma coluna inteira
   * de `?` com cara de resposta ausente, quando a verdade é que aquela base não
   * tem bairro nenhum para dar.
   */
  const camposDisponiveis: Campo[] = useMemo(
    () =>
      CAMPOS.filter(
        (c) =>
          c.id === "principal" ||
          lote.itens.some((i) => valorDoCampo(lote.estados.get(i.termo), c.id)),
      ),
    [lote.itens, lote.estados],
  );

  /**
   * O campo ESCOLHIDO pode não existir na rodada atual.
   *
   * Ele mora num `useState` que sobrevive à rodada. Quem escolheu "bairro" numa
   * lista de CEPs e depois rodou uma lista de filmes ficava com uma coluna
   * inteira de `?` — e sem o segmentado na tela, porque com um campo só ele não
   * é desenhado. A coluna negava, o cabeçalho dizia "resolvido", e não havia
   * como voltar.
   */
  const efetivo: CampoId = camposDisponiveis.some((c) => c.id === campo) ? campo : "principal";

  /**
   * A COLUNA COPIÁVEL — derivada do INSTANTÂNEO da rodada, jamais do campo vivo.
   *
   * Se ela saísse de `texto`, apagar a linha 3 depois de rodar re-indexaria a
   * coluna inteira em silêncio, mantendo as respostas antigas: a promessa
   * "linha i da saída = linha i da entrada" rompida sem aviso, num artefato que
   * vai para a folha da prova. Vindo do instantâneo, não há o que re-indexar —
   * basta uma faixa dizendo que o campo mudou, e o botão de copiar continua
   * servindo as outras linhas.
   */
  const coluna = useMemo(() => {
    // Uma célula por LINHA DO TEXTO COLADO, **inclusive as em branco**: quem
    // cola de volta numa planilha precisa das respostas nas mesmas linhas de
    // onde tirou as perguntas. Pular as vazias devolvia a resposta seguinte um
    // degrau acima e deslocava tudo o que vinha depois, sem aviso.
    const celulas = Array.from({ length: lote.totalLinhas }, () => "");
    for (const i of lote.itens) {
      const v = valorDoCampo(lote.estados.get(i.termo), efetivo);
      celulas[i.posicao] = v ?? (marcarVazias ? SEM_RESPOSTA : "");
    }
    return celulas.join("\n");
  }, [lote.itens, lote.estados, lote.totalLinhas, efetivo, marcarVazias]);

  const desatualizado = lote.itens.length > 0 && texto !== lote.textoDoLote;

  const executar = useCallback(() => {
    const d = dividirEmItens(texto);
    void rodar({
      texto,
      itens: d.linhas,
      termos: d.termos,
      excedentes: d.excedentes,
      vaziasIgnoradas: d.vaziasIgnoradas,
      totalLinhas: d.totalLinhas,
    });
  }, [texto]);

  const aplicarDivisaoPorVirgula = useCallback(() => {
    escrever(dividirPorVirgula(ler().texto));
  }, []);

  return {
    texto,
    setTexto,
    previa,
    lote,
    estadosNaOrdem,
    resumo,
    coluna,
    campo: efetivo,
    setCampo,
    camposDisponiveis,
    marcarVazias,
    setMarcarVazias,
    desatualizado,
    executar,
    parar,
    aplicarDivisaoPorVirgula,
  };
}

/** Para a navegação acender o ponto quando a rodada segue fora da tela. */
export function useLoteEmAndamento(): boolean {
  return useSyncExternalStore(assinar, emAndamento);
}
