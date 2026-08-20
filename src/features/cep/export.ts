import { ApiError, apiFetchArquivo } from "@/lib/api";
import { baixarArquivo } from "@/lib/baixar";

/**
 * O download do CSV de CEP, FORA do React.
 *
 * POR QUE FORA: o card do resultado é remontado a cada tecla — a chave dele é
 * `${decoderId}::${output}` e o `output` do curinga muda junto com o padrão. Um
 * `useState("baixando")` dentro do card evapora no instante em que a pessoa
 * digita mais um dígito, e a requisição de alguns MB continua viva sem ninguém
 * para receber a resposta: nem arquivo, nem erro, nem botão em "Baixando…". Ela
 * conclui que o botão não funciona e clica de novo.
 *
 * Aqui o estado é do PADRÃO, não do componente. O card lê na montagem e se
 * inscreve; se ele morrer no meio, o download termina do mesmo jeito (salvar
 * arquivo é efeito de DOM, não de React) e o card que voltar com o mesmo padrão
 * reencontra o que estava acontecendo. É a mesma disciplina do `emVoo` do
 * `lookup-cache`.
 */
export type EstadoExport =
  | { fase: "parado" }
  | { fase: "baixando" }
  | { fase: "erro"; mensagem: string };

const PARADO: EstadoExport = { fase: "parado" };

const estados = new Map<string, EstadoExport>();
const ouvintes = new Map<string, Set<() => void>>();

export function estadoDoExport(padrao: string): EstadoExport {
  return estados.get(padrao) ?? PARADO;
}

export function ouvirExport(padrao: string, cb: () => void): () => void {
  const set = ouvintes.get(padrao) ?? new Set();
  ouvintes.set(padrao, set);
  set.add(cb);
  return () => {
    set.delete(cb);
    if (set.size === 0) ouvintes.delete(padrao);
  };
}

function definir(padrao: string, estado: EstadoExport) {
  if (estado.fase === "parado") estados.delete(padrao);
  else estados.set(padrao, estado);
  for (const cb of ouvintes.get(padrao) ?? []) cb();
}

/**
 * Baixa a lista completa do padrão. Reentrante: dois cliques no mesmo padrão
 * não viram duas requisições de alguns MB.
 */
export async function baixarCsvDeCeps(padrao: string): Promise<void> {
  if (estadoDoExport(padrao).fase === "baixando") return;
  definir(padrao, { fase: "baixando" });
  try {
    const { blob, nome } = await apiFetchArquivo(
      `/cep/export?pattern=${encodeURIComponent(padrao)}`,
      "ceps.csv",
    );
    // `baixarArquivo` devolvendo `false` é o navegador recusando — e recusa
    // silenciosa é o pior desfecho possível para um botão de download.
    definir(
      padrao,
      baixarArquivo(blob, nome)
        ? { fase: "parado" }
        : { fase: "erro", mensagem: "O navegador não deixou salvar o arquivo." },
    );
  } catch (e) {
    // SÓ O `ApiError` carrega mensagem em pt-BR. Confiar no `.message` de
    // qualquer rejeição é o defeito que o `brasilapi.ts` já consertou uma vez
    // neste repositório: uma queda de rede rejeita o próprio `fetch` — e o
    // `res.blob()`, que é onde os ~3 MB de fato trafegam — com um `TypeError`
    // do navegador, e o card mostraria "Failed to fetch" (ou "Load failed", no
    // Safari) para quem só precisa saber que a conexão caiu. O Wi-Fi do local
    // no meio de um download de 3 MB não é hipótese: é o caso comum.
    if (e instanceof ApiError) {
      // O 401 derruba a sessão dentro do clique e a tela troca embaixo da
      // pessoa; uma mensagem nossa competiria com a tela de login.
      if (e.status === 401) return definir(padrao, PARADO);
      // O resto o servidor já escreveu em pt-BR, inclusive o texto do 429.
      return definir(padrao, { fase: "erro", mensagem: e.message });
    }
    definir(padrao, {
      fase: "erro",
      mensagem: "Não consegui baixar o arquivo — a conexão caiu no meio.",
    });
  }
}

/** Só para os testes: nenhum padrão fica com estado de um caso anterior. */
export function limparExports() {
  estados.clear();
  ouvintes.clear();
}
