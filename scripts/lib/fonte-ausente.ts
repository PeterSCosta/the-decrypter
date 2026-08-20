import { existsSync } from "node:fs";

/**
 * O que fazer quando a FONTE de um gerador não está no repositório.
 *
 * Vários geradores desta pasta partem de dado bruto que não é versionado —
 * export de BigQuery, PDF de prefeitura, dump de API. O artefato que eles
 * produzem **é** versionado, porque é ele que a bancada carrega. Numa clonagem
 * limpa isso criava um beco: `pnpm build:data` morria no segundo passo com
 * ENOENT, e os oito passos seguintes nunca rodavam.
 *
 * As duas saídas erradas, para deixar escrito por que nenhuma foi escolhida:
 *
 *  • **Falhar sempre** é o que acontecia. O comando fica inutilizável para quem
 *    clonou o repositório, e a cadeia inteira depende do dado mais pesado estar
 *    na máquina de quem roda.
 *  • **Pular calado** é pior, e é a armadilha que este repositório já nomeia em
 *    `lib/api/guards`: quem pula em silêncio entrega um artefato velho com cara
 *    de recém-gerado, e ninguém descobre até a prova.
 *
 * A saída daqui é a terceira: **pula, mas grita** — e só pula se o artefato
 * versionado existir. Se a fonte E a saída estiverem ausentes, aí não há nada a
 * preservar e o passo falha, como deve.
 */
export function fonteAusente(opts: {
  /** Caminho do dado bruto que o gerador consome. */
  fonte: string;
  /** Caminho do artefato versionado que ele produz. */
  saida: string;
  /** Nome do passo, para a mensagem. */
  passo: string;
  /** Onde arrumar a fonte — vai na mensagem, para não virar caça ao tesouro. */
  comoObter: string;
}): boolean {
  if (existsSync(opts.fonte)) return false;

  if (!existsSync(opts.saida)) {
    console.error(
      [
        "",
        `✗ ${opts.passo}: a fonte NÃO existe e o artefato TAMBÉM não.`,
        `    fonte esperada : ${opts.fonte}`,
        `    saída esperada : ${opts.saida}`,
        `    como obter     : ${opts.comoObter}`,
        "",
        "  Não há artefato versionado para preservar, então este passo falha de",
        "  propósito: seguir em frente entregaria uma bancada sem esta base.",
        "",
      ].join("\n"),
    );
    process.exit(1);
  }

  console.warn(
    [
      "",
      `⚠ ${opts.passo}: PULADO — a fonte não está neste clone.`,
      `    fonte ausente : ${opts.fonte}`,
      `    mantido       : ${opts.saida} (versionado, é o que a bancada usa)`,
      `    como obter    : ${opts.comoObter}`,
      "",
      "  O artefato NÃO foi regerado. Se a fonte mudou, este clone está velho.",
      "",
    ].join("\n"),
  );
  return true;
}

/**
 * A mesma disciplina, quando a fonte é a REDE e não um arquivo.
 *
 * `build:cid10` baixa o CSV do DATASUS. Um servidor de órgão público fora do ar
 * — que é o caso comum, não a exceção — derrubava a cadeia inteira no último
 * passo, depois de nove passos bem-sucedidos. O artefato é versionado; a rede
 * não é pré-requisito para ele continuar existindo.
 *
 * Envolve o corpo do gerador. Se a rede falhar E o artefato existir, avisa alto
 * e devolve `false` (nada foi regerado). Se o artefato também não existir, a
 * falha original sobe, porque aí não há o que preservar.
 */
export async function comFonteDeRede(opts: {
  saida: string;
  passo: string;
  comoObter: string;
  gerar: () => Promise<void>;
}): Promise<boolean> {
  try {
    await opts.gerar();
    return true;
  } catch (erro) {
    if (!existsSync(opts.saida)) {
      console.error(
        `\n✗ ${opts.passo}: a fonte de rede falhou e não há artefato para preservar.\n`,
      );
      throw erro;
    }
    console.warn(
      [
        "",
        `⚠ ${opts.passo}: PULADO — a fonte de rede não respondeu.`,
        `    erro       : ${erro instanceof Error ? erro.message : String(erro)}`,
        `    mantido    : ${opts.saida} (versionado, é o que a bancada usa)`,
        `    como obter : ${opts.comoObter}`,
        "",
        "  O artefato NÃO foi regerado. Se a fonte mudou, este clone está velho.",
        "",
      ].join("\n"),
    );
    return false;
  }
}
