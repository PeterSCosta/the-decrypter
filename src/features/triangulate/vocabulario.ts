import type { Sugestao } from "@/components/ui/combobox";
import { stripDiacritics } from "@/features/decoder/engine/util";
import { getBridges, getStreets, loadBridges, loadStreets } from "@/lib/data";

/**
 * Vocabulário de lugares para o autocomplete, **da base local**.
 *
 * Sem rede de propósito. O comentário do `use-triangulate` registra que
 * reconsultar a cada tecla derrubaria o Nominatim — e a política de uso da
 * instância pública proíbe justamente esse padrão. As ruas e as pontes de
 * Blumenau/Itajaí cobrem o que a bancada resolve, respondem em memória e
 * funcionam sem conexão. Ponto comercial ("padaria X") fica fora; para isso o
 * caminho continua sendo digitar o endereço e deixar a escada de resolução
 * chamar o geocodificador uma vez, ao confirmar.
 */

export interface ItemVocabulario extends Sugestao {
  lat: number;
  lng: number;
  /** Rótulo já pronto para a lista de pontos. */
  rotulo: string;
  detalheOrigem: string;
  origem: "rua" | "ponte";
}

const dobra = (s: string) => stripDiacritics(s).toLowerCase();

let cache: ItemVocabulario[] | null = null;

/** Dispara a carga das bases que alimentam as sugestões. */
export function prepararVocabulario(): void {
  loadStreets().catch(() => {});
  loadBridges().catch(() => {});
}

function montar(): ItemVocabulario[] {
  const itens: ItemVocabulario[] = [];

  const ruas = getStreets();
  if (ruas) {
    // `streets.json` repete a rua uma vez por bairro (4.426 linhas para ~4.137
    // nomes). Sem deduplicar, a lista mostraria a mesma rua três vezes.
    const vistos = new Set<string>();
    for (const r of ruas.rows) {
      if (r.lat == null || r.lng == null) continue;
      const nome = `${r.tipo} ${r.nome}`;
      if (vistos.has(nome)) continue;
      vistos.add(nome);
      itens.push({
        id: `rua:${r.codigo}:${r.bairro}`,
        texto: nome,
        detalhe: r.bairro,
        rotulo: nome,
        detalheOrigem: `${r.bairro} · centro do logradouro`,
        origem: "rua",
        lat: r.lat,
        lng: r.lng,
      });
    }
  }

  const pontes = getBridges();
  if (pontes) {
    for (const p of pontes.rows) {
      if (p.lat == null || p.lng == null) continue;
      itens.push({
        id: `ponte:${p.nome}`,
        texto: p.nome,
        detalhe: p.apelidos.length ? p.apelidos.join(" · ") : p.tipo,
        rotulo: p.nome,
        detalheOrigem: p.lei ? `Lei ${p.lei}` : "OpenStreetMap",
        origem: "ponte",
        lat: p.lat,
        lng: p.lng,
      });
    }
  }

  return itens;
}

/** Sugestões para o que está sendo digitado. Vazio abaixo de 2 letras. */
export function sugerir(termo: string, limite = 8): ItemVocabulario[] {
  const q = dobra(termo.trim());
  if (q.length < 2) return [];
  // As bases chegam de forma assíncrona; refaz o índice enquanto ainda faltar
  // alguma, e congela quando as duas estiverem em mãos.
  if (!cache || !getStreets() || !getBridges()) cache = montar();
  if (!cache.length) return [];

  const acertos: { item: ItemVocabulario; rank: number }[] = [];
  for (const item of cache) {
    const alvo = dobra(item.texto);
    // Apelido de ponte também casa: "ponte de ferro" é como as pessoas falam.
    const pos = alvo.indexOf(q);
    const porApelido = pos < 0 && item.detalhe ? dobra(item.detalhe).includes(q) : false;
    if (pos < 0 && !porApelido) continue;
    // Começo do nome vale mais que meio; nome curto desempata (mais específico).
    acertos.push({ item, rank: (pos === 0 ? 0 : pos < 0 ? 2 : 1) * 1000 + alvo.length });
    if (acertos.length > 400) break;
  }
  return acertos
    .sort((a, b) => a.rank - b.rank)
    .slice(0, limite)
    .map((a) => a.item);
}
