import type { LookupHits } from "@/lib/lookup-cache";
import type { Acerto, CampoId, EstadoItem, ResumoLote } from "./tipos";

/**
 * A leitura de uma resposta do `/api/lookup` — onde mora toda a honestidade da
 * aba, e por isso longe do React, num arquivo puro e testável.
 */

/**
 * Os nomes das bandeiras do servidor em pt-BR.
 *
 * O servidor manda o identificador cru (`CepExato`, `RuaOuBairro`) e a tradução
 * é trabalho de tela. Bandeira nova que ainda não esteja aqui aparece com o
 * nome cru — degradação honesta, e melhor que sumir de um mapa desatualizado.
 */
const BASE_EM_PT: Record<string, string> = {
  CepExato: "CEP",
  CepPrefixoSc: "CEP sem o prefixo de SC",
  CepCuringa: "CEP com curinga",
  Municipio: "município do IBGE",
  Plaqueta: "plaqueta de poste",
  RuaOuBairro: "rua ou bairro",
  Aeroporto: "aeroporto",
  CidCodigo: "código da CID-10",
  CidNome: "nome de doença na CID-10",
  LoteBlumenau: "cadastro imobiliário de Blumenau",
  Filme: "filme pelo ID da IMDb",
};

export const nomeDaBase = (bandeira: string): string => BASE_EM_PT[bandeira] ?? bandeira;

const junta = (...p: (string | null | undefined)[]) => p.filter(Boolean).join(", ");

/**
 * Os acertos de uma resposta — **um por chave não-nula**, e nada além disso.
 *
 * Zero "provavelmente", zero sugestão por proximidade, zero nota. Se a chave
 * veio nula, a base não tinha; se veio, tinha. É a mesma pré-resolução que os
 * decoders de lookup já aplicam.
 */
export function acertosDe(h: LookupHits): Acerto[] {
  const bruto: Acerto[] = [];
  const out = {
    /**
     * Um acerto sem NADA para dizer não é acerto.
     *
     * A base de aeroportos traz `nome`, `cidade` e `pais` nulos em parte das
     * linhas; o acerto saía com a base e o texto vazio, a linha ficava muda
     * ("aeroporto: "), o cabeçalho contava "1 resolvido" e a coluna escrevia
     * `?`. Três afirmações se contradizendo na mesma tela. Sem texto, a
     * resposta certa é que a base não tinha o que responder.
     */
    push(a: Acerto) {
      if (a.texto.trim().length > 0) bruto.push(a);
    },
  };
  const campos = (c: Partial<Record<CampoId, string>>) => c;

  const doCep = (c: NonNullable<LookupHits["cep"]>, rotulo: string) =>
    out.push({
      base: rotulo,
      texto: junta(c.logradouro, c.bairro, c.localidade, c.uf) || c.code,
      campos: campos({
        principal: junta(c.logradouro, c.bairro, c.localidade, c.uf) || c.code,
        ...(c.logradouro ? { logradouro: c.logradouro } : {}),
        ...(c.bairro ? { bairro: c.bairro } : {}),
        ...(c.localidade ? { cidade: c.localidade } : {}),
        ...(c.uf ? { uf: c.uf } : {}),
        ...(c.lat != null && c.lng != null ? { coordenada: `${c.lat}, ${c.lng}` } : {}),
      }),
    });

  if (h.cep) doCep(h.cep, "CEP");
  for (const c of h.cepsPrefixo ?? []) if (c) doCep(c, "CEP sem o prefixo de SC");
  // A busca com curinga devolve MUITOS; o total verdadeiro é o que importa, e
  // listar doze numa linha de tabela esconde justamente a contagem.
  if (h.cepCuringa && h.cepCuringa.total > 0) {
    out.push({
      base: "CEP com curinga",
      texto: `${h.cepCuringa.total} CEP(s) casam o padrão`,
      campos: campos({ principal: String(h.cepCuringa.total) }),
    });
  }
  if (h.municipio) {
    const m = h.municipio;
    out.push({
      base: "município do IBGE",
      texto: `${m.nome} — ${m.uf}`,
      campos: campos({ principal: `${m.nome} — ${m.uf}`, cidade: m.nome, uf: m.uf }),
    });
  }
  if (h.aeroporto) {
    const a = h.aeroporto;
    out.push({
      base: "aeroporto",
      texto: junta(a.nome, a.cidade, a.pais),
      campos: campos({
        principal: junta(a.nome, a.cidade, a.pais),
        ...(a.cidade ? { cidade: a.cidade } : {}),
        ...(a.lat != null && a.lng != null ? { coordenada: `${a.lat}, ${a.lng}` } : {}),
      }),
    });
  }
  if (h.poste) {
    const p = h.poste as {
      plaqueta?: string;
      rua?: string;
      bairro?: string;
      lat?: number;
      lng?: number;
    };
    out.push({
      base: "poste",
      texto: junta(p.rua, p.bairro) || String(p.plaqueta ?? ""),
      campos: campos({
        principal: junta(p.rua, p.bairro) || String(p.plaqueta ?? ""),
        ...(p.rua ? { logradouro: p.rua } : {}),
        ...(p.bairro ? { bairro: p.bairro } : {}),
        ...(p.lat != null && p.lng != null ? { coordenada: `${p.lat}, ${p.lng}` } : {}),
      }),
    });
  }
  if (h.postes?.length) {
    out.push({
      base: "postes na rua",
      texto: `${h.postes.length} poste(s)`,
      campos: campos({ principal: String(h.postes.length) }),
    });
  }
  if (h.cid) {
    out.push({
      base: "CID-10",
      texto: `${h.cid.codigo} — ${h.cid.descricao}`,
      campos: campos({ principal: h.cid.descricao }),
    });
  }
  if (h.cids?.length) {
    out.push({
      base: "CID-10 pelo nome",
      texto: h.cids.map((c) => c.codigo).join(", "),
      campos: campos({ principal: h.cids[0].codigo }),
    });
  }
  for (const l of [h.lote, ...(h.lotes ?? [])]) {
    if (!l) continue;
    out.push({
      base: "cadastro imobiliário de Blumenau",
      texto: junta(l.logradouro, l.numero, l.bairro),
      campos: campos({
        principal: junta(l.logradouro, l.numero, l.bairro),
        ...(l.logradouro ? { logradouro: l.logradouro } : {}),
        ...(l.bairro ? { bairro: l.bairro } : {}),
        ...(l.lat != null && l.lng != null ? { coordenada: `${l.lat}, ${l.lng}` } : {}),
      }),
    });
  }
  if (h.filme) {
    const f = h.filme;
    // O título brasileiro quando existe; senão o original, e a tela do
    // Decodificador já explica por quê. Aqui não se troca um pelo outro em
    // silêncio: o `texto` diz qual é.
    const principal = f.tituloBr ?? f.tituloOriginal ?? f.tituloIngles ?? f.imdbId;
    out.push({
      base: "filme",
      texto: f.tituloBr
        ? `${principal}${f.ano ? ` (${f.ano})` : ""}`
        : `${principal}${f.ano ? ` (${f.ano})` : ""} — título original; sem título brasileiro na fonte`,
      campos: campos({ principal }),
    });
  }
  return bruto;
}

/**
 * Resposta → desfecho.
 *
 * ── A REGRA QUE NÃO PODE AFROUXAR ──────────────────────────────────────────
 * `consultou` **ausente** vira `indeterminado`, nunca `sem-acerto`. Enquanto o
 * campo não estiver em produção, dizer "perguntei e não achei" afirmaria uma
 * consulta que talvez não tenha havido — e a aba inteira existe para não fazer
 * isso. `indeterminado` é feio na tela e é o preço certo.
 *
 * ── E A CONFERÊNCIA DE IDENTIDADE ──────────────────────────────────────────
 * A promessa em voo é compartilhada pelo cache, e um aborto pode fazer a
 * resposta de um termo chegar onde outro esperava. É a mesma disciplina que os
 * decoders de lookup aplicam com `ctx.hits?.q !== texto`: ficha de outro item
 * preenchendo a linha errada é resposta errada com toda a confiança do mundo.
 */
export function estadoDeResposta(h: LookupHits, termo: string): EstadoItem {
  if (h.q !== termo) return { tipo: "interrompido" };

  const acertos = acertosDe(h);
  if (acertos.length > 0) return { tipo: "resolvido", acertos };

  const consultou = h.consultou;
  if (!Array.isArray(consultou)) return { tipo: "indeterminado" };
  if (consultou.length === 0) return { tipo: "sem-forma" };
  return { tipo: "sem-acerto", bases: consultou.map(nomeDaBase) };
}

/** O rótulo curto de cada desfecho, e se ele conta como "incompleto". */
const BALDES: { tipo: EstadoItem["tipo"]; rotulo: string; alerta: boolean }[] = [
  { tipo: "resolvido", rotulo: "resolvido", alerta: false },
  { tipo: "sem-acerto", rotulo: "perguntei, nenhuma base tinha", alerta: false },
  { tipo: "sem-forma", rotulo: "não sei procurar", alerta: false },
  { tipo: "indeterminado", rotulo: "não sei dizer se perguntei", alerta: true },
  { tipo: "recusado", rotulo: "recusado antes de sair", alerta: false },
  { tipo: "falhou", rotulo: "falhou", alerta: true },
  { tipo: "interrompido", rotulo: "interrompido", alerta: true },
  { tipo: "nao-perguntado", rotulo: "não perguntei", alerta: true },
  { tipo: "consultando", rotulo: "consultando", alerta: false },
  { tipo: "fila", rotulo: "na fila", alerta: false },
];

/**
 * O cabeçalho de integridade.
 *
 * Ele mostra TODOS os baldes não-zero, e a soma deles é o total — há teste
 * prendendo isso. Um resumo sem invariante é onde um balde some, e um balde que
 * some é meia lista entregue com cara de lista inteira.
 */
export function resumir(estados: EstadoItem[]): ResumoLote {
  const conta = new Map<string, number>();
  for (const e of estados) conta.set(e.tipo, (conta.get(e.tipo) ?? 0) + 1);

  const baldes = BALDES.filter((b) => (conta.get(b.tipo) ?? 0) > 0).map((b) => ({
    rotulo: b.rotulo,
    quantos: conta.get(b.tipo) ?? 0,
    alerta: b.alerta,
  }));

  return {
    total: estados.length,
    baldes,
    incompleto: baldes.some((b) => b.alerta),
  };
}
