/**
 * Código FIPE → veículo, ano e preço médio.
 *
 * ── A ÚNICA CONSULTA QUE **NÃO** PASSA PELO BACKEND, E É DE PROPÓSITO ────────
 * O WAF da FIPE bloqueia IP de datacenter — foi isso que derrubou o
 * `/api/fipe/preco` da BrasilAPI, que dá 500 permanente. Chamar do nosso .NET
 * seria bater na mesma parede, e forjar cabeçalho para escapar dela é driblar
 * barreira posta de propósito. Do navegador de quem está jogando, a chamada é
 * exatamente o que o site faz, do mesmo tipo de IP.
 *
 * ── A ORDEM CERTA DOS ENDPOINTS (medida em 18/08/2026) ──────────────────────
 * A nota que este projeto carregava estava INVERTIDA, e custou meia hora até
 * alguém medir:
 *
 *   ✗ `ConsultarValorComTodosParametros` com `tipoConsulta=codigo` sozinho
 *     responde **"Parâmetros inválidos"** nos três tipos de veículo.
 *   ✓ `ConsultarAnoModeloPeloCodigoFipe` é quem aceita o código nu, e devolve
 *     os anos disponíveis. Só DEPOIS, com um ano na mão, o
 *     `ConsultarValorComTodosParametros` responde.
 *
 * O tipo de veículo (1 carro, 2 moto, 3 caminhão) **não está no código**, então
 * a varredura dos três é obrigatória — e ela é barata, porque o tipo errado
 * responde `nadaencontrado` na hora.
 *
 * É API interna, sem contrato. Se o site mudar, isto quebra — e o certo é
 * dizer "fonte fora do ar", não fingir que o veículo não existe.
 */

const BASE = "https://veiculos.fipe.org.br/api/veiculos/";

export interface VeiculoFipe {
  codigo: string;
  marca: string;
  modelo: string;
  anoModelo: number;
  combustivel: string;
  valor: string;
  mesReferencia: string;
  /** 1 carro · 2 moto · 3 caminhão — descoberto pela varredura. */
  tipo: number;
  /** Os outros anos do mesmo código, quando há mais de um. */
  outrosAnos: string[];
}

/** A forma canônica: seis dígitos, hífen, um dígito. */
export const FIPE_RE = /^\d{6}-\d$/;

async function post<T>(rota: string, corpo: Record<string, string | number>): Promise<T | null> {
  try {
    const r = await fetch(BASE + rota, {
      method: "POST",
      // Form-urlencoded, e não JSON: com `application/json` o preflight barra.
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(Object.entries(corpo).map(([k, v]) => [k, String(v)])),
    });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

interface Erro {
  codigo?: string;
  erro?: string;
}
interface Ano {
  Label: string;
  Value: string;
}

/** O mês de referência vigente — a tabela muda todo mês. */
async function tabelaVigente(): Promise<number | null> {
  const refs = await post<{ Codigo: number; Mes: string }[]>("ConsultarTabelaDeReferencia", {});
  return Array.isArray(refs) && refs.length ? refs[0].Codigo : null;
}

export async function consultarFipe(codigo: string): Promise<VeiculoFipe | null> {
  const cod = codigo.trim();
  if (!FIPE_RE.test(cod)) return null;

  const ref = await tabelaVigente();
  if (ref === null) return null;

  for (const tipo of [1, 2, 3]) {
    const anos = await post<Ano[] | Erro>("ConsultarAnoModeloPeloCodigoFipe", {
      codigoTabelaReferencia: ref,
      codigoTipoVeiculo: tipo,
      modeloCodigoExterno: cod,
    });
    // O tipo errado responde `{codigo:"0", erro:"nadaencontrado"}` — é assim
    // que a varredura sabe que tem de continuar.
    if (!Array.isArray(anos) || anos.length === 0) continue;

    const [anoModelo, combustivel] = String(anos[0].Value).split("-");
    const v = await post<Record<string, string | number> & Erro>(
      "ConsultarValorComTodosParametros",
      {
        codigoTabelaReferencia: ref,
        codigoTipoVeiculo: tipo,
        modeloCodigoExterno: cod,
        ano: anos[0].Value,
        anoModelo,
        codigoTipoCombustivel: combustivel,
        tipoVeiculo: "carro",
        tipoConsulta: "codigo",
      },
    );
    if (!v || v.erro || !v.Modelo) continue;

    return {
      codigo: cod,
      marca: String(v.Marca ?? ""),
      modelo: String(v.Modelo ?? ""),
      anoModelo: Number(v.AnoModelo ?? 0),
      combustivel: String(v.Combustivel ?? ""),
      valor: String(v.Valor ?? ""),
      mesReferencia: String(v.MesReferencia ?? "").trim(),
      tipo,
      outrosAnos: anos.slice(1).map((a) => a.Label),
    };
  }
  return null;
}
