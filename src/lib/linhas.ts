import { normalizaDigitos } from "./digitos";
import { type MotivoSemConsulta, motivoSemConsulta } from "./lookup-cache";

/**
 * Um texto colado → itens consultáveis.
 *
 * ── DUAS LISTAS, E NÃO UMA ─────────────────────────────────────────────────
 * A unidade da TELA é a linha de entrada; a unidade da REDE é o termo distinto.
 * Trinta linhas iguais desenham trinta linhas e custam **uma** permissão. Manter
 * as duas listas separadas torna o alinhamento da coluna copiável correto por
 * construção — "linha i da saída = linha i da entrada" deixa de depender de
 * disciplina de quem escreve a tela.
 *
 * ── POR QUE NÃO SE DIVIDE POR VÍRGULA SOZINHO ──────────────────────────────
 * Porque `-26.9194, -49.0661` é UM item, e `Rua XV, 100` também. Cortar em
 * vírgula por conta própria transformaria uma coordenada em dois números sem
 * sentido. A vírgula só é oferecida — nunca aplicada — quando o texto **não tem
 * quebra de linha nenhuma** e tem duas vírgulas ou mais, que é a forma de quem
 * colou de um PDF. Quem decide é quem colou, num clique.
 */

/**
 * Teto de termos distintos por rodada.
 *
 * Três razões, todas com número. (1) O backend dá **120 requisições por minuto
 * por IP** em janela fixa, e a equipe inteira atrás do NAT do local divide esse
 * balde com a bancada. (2) O cache é FIFO com teto de 200: um lote grande
 * demais expulsaria a própria cabeça, e a entrada expulsa não é abortada. (3)
 * Sessenta linhas já são mais do que se lê numa tela.
 *
 * O excedente **não é descartado calado**: ele volta nomeado, e a tela o
 * escreve.
 */
export const TETO_POR_LOTE = 60;

export interface ItemLinha {
  /** 1-based, como a pessoa conta as linhas do que colou. */
  indice: number;
  /**
   * A posição no texto COLADO, contando as linhas em branco (0-based).
   *
   * A coluna copiável promete "linha i da saída = linha i da entrada", e a
   * entrada é o bloco que a pessoa colou — não a lista de itens. Uma coluna de
   * planilha com um buraco no meio devolveria a resposta seguinte um degrau
   * acima, e quem colasse de volta receberia tudo deslocado a partir dali.
   */
  posicao: number;
  /** A linha como veio, para a tela poder mostrar o que a pessoa escreveu. */
  bruto: string;
  /** A forma normalizada que vai à rede — e que é a chave do cache. */
  termo: string;
  /** Por que esta linha não será consultada; `null` quando será. */
  motivo: MotivoSemConsulta | null;
}

export interface Divisao {
  /** Uma por linha não-vazia do texto, na ordem. */
  linhas: ItemLinha[];
  /** Linhas em branco que não viraram item. Contadas, nunca escondidas. */
  vaziasIgnoradas: number;
  /** Termos distintos que serão consultados, na ordem da primeira aparição. */
  termos: string[];
  /** O que passou do teto — nomeado, para a tela poder dizer o que ficou fora. */
  excedentes: string[];
  /** O texto parece uma lista numa linha só, separada por vírgula. */
  pareceListaPorVirgula: boolean;
  /** Quantas linhas o texto colado tem, contando as em branco. */
  totalLinhas: number;
}

/** `1. `, `1) `, `- `, `• `, `* ` — a numeração que vem junto de lista colada. */
const MARCADOR = /^\s*(?:[-–—•*]|\d{1,3}[.)])\s+/;

export function dividirEmItens(texto: string, teto = TETO_POR_LOTE): Divisao {
  const linhas: ItemLinha[] = [];
  const termos: string[] = [];
  const excedentes: string[] = [];
  const vistos = new Set<string>();
  let vaziasIgnoradas = 0;

  // CRLF primeiro: texto colado do Windows ou de PDF traz `\r`, e um `\r`
  // pendurado no fim do termo é uma chave de cache diferente da mesma entrada
  // digitada à mão.
  const cruas = texto.replace(/\r\n?/g, "\n").split("\n");

  for (const [posicao, crua] of cruas.entries()) {
    const semMarcador = crua.replace(MARCADOR, "");
    // O MESMO tratamento que a bancada aplica antes de consultar: sem isto, a
    // mesma entrada teria chave de cache diferente nas duas telas, e o lote
    // pagaria uma permissão por algo que a bancada já tinha em mãos.
    const termo = normalizaDigitos(semMarcador).trim();
    if (termo.length === 0) {
      vaziasIgnoradas++;
      continue;
    }

    // O motivo é calculado por ITEM, não sobre o texto inteiro. É a diferença
    // entre "a bancada desligou tudo porque você colou uma lista" e "esta linha
    // aqui é longa demais" — e é a razão de a aba existir.
    const motivo = motivoSemConsulta(termo);
    linhas.push({ indice: linhas.length + 1, posicao, bruto: crua, termo, motivo });

    if (motivo !== null || vistos.has(termo)) continue;
    vistos.add(termo);
    if (termos.length < teto) termos.push(termo);
    else excedentes.push(termo);
  }

  return {
    linhas,
    vaziasIgnoradas,
    termos,
    excedentes,
    pareceListaPorVirgula: !texto.includes("\n") && (texto.match(/,/g)?.length ?? 0) >= 2,
    totalLinhas: texto.length === 0 ? 0 : cruas.length,
  };
}

/**
 * A divisão por vírgula, aplicada só quando alguém pede.
 *
 * Devolve o texto com uma entrada por linha, para o campo passar a mostrar o
 * que de fato será consultado. Trocar o conteúdo do campo é deliberado: a
 * pessoa vê a divisão antes de gastar requisição, e pode desfazer.
 */
export function dividirPorVirgula(texto: string): string {
  return texto
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .join("\n");
}
