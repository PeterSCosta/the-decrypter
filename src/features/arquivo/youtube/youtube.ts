/**
 * YouTube — o que dá para oferecer sem violar termo nenhum.
 *
 * ── A REGRA VEM ANTES DA CAPACIDADE ─────────────────────────────────────────
 * Não se baixa o vídeo nem o áudio. As Políticas de Desenvolvedor do YouTube
 * (III.E.1) proíbem baixar, importar, cachear ou armazenar cópia do conteúdo
 * audiovisual sem autorização escrita. `yt-dlp`, ripagem de `googlevideo.com` e
 * proxy de stream estão fora — **por regra, não por dificuldade**. Quando os
 * bytes são necessários, o caminho é pedir o arquivo a quem publicou.
 *
 * O que sobra, verificado, é mais do que parece:
 *  • **oEmbed** resolve título, canal e a PROPORÇÃO real, sem chave e com CORS.
 *  • **Quadros reais** — medidos aqui: `oar1` e `oar2` vêm em 1920×1080,
 *    `maxresdefault` em 1280×720, `hq*` em 480×360 —, servidos pelo CDN
 *    com `access-control-allow-origin: *` — ou seja, o canvas NÃO fica
 *    contaminado e dá para analisar os pixels.
 *  • **Pular para o segundo N** no player embutido.
 *
 * ── A ARMADILHA MAIS PERIGOSA DESTA TELA ────────────────────────────────────
 * NÃO rodar análise de bits nesses quadros. Eles são recomprimidos pelo Google
 * a partir de um vídeo já com perdas: qualquer detector de LSB cospe ruído com
 * cara de sinal. Servem para OLHAR — texto na tela, placa, rosto —, não para
 * esteganografia.
 */

export interface VideoDoYoutube {
  id: string;
  titulo: string;
  canal: string;
  canalUrl: string;
  /** Proporção real, deduzida do `maxwidth`. */
  largura: number;
  altura: number;
  miniaturaOembed: string;
}

/** Extrai o ID de qualquer forma de URL do YouTube — ou do próprio ID solto. */
export function idDoYoutube(entrada: string): string | null {
  const t = entrada.trim();
  if (/^[\w-]{11}$/.test(t)) return t;
  const padroes = [
    /youtube\.com\/watch\?(?:.*&)?v=([\w-]{11})/,
    /youtu\.be\/([\w-]{11})/,
    /youtube\.com\/embed\/([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
    /youtube\.com\/live\/([\w-]{11})/,
  ];
  for (const p of padroes) {
    const m = t.match(p);
    if (m) return m[1];
  }
  return null;
}

/**
 * Os quadros que o CDN publica.
 *
 * São QUATRO posições fixas — não é possível pedir um segundo arbitrário. As
 * `oar` são as de proporção original em alta; as `hq` são o retrato 4:3 antigo,
 * que às vezes tem detalhe que a versão cortada perdeu.
 */
export const QUADROS_PUBLICADOS = [
  { chave: "maxresdefault", rotulo: "capa (máxima)" },
  { chave: "oar2", rotulo: "quadro 1" },
  { chave: "oar1", rotulo: "quadro 2" },
  { chave: "oar3", rotulo: "quadro 3" },
  { chave: "hq1", rotulo: "quadro 1 (4:3)" },
  { chave: "hq2", rotulo: "quadro 2 (4:3)" },
  { chave: "hq3", rotulo: "quadro 3 (4:3)" },
] as const;

export const urlDoQuadro = (id: string, chave: string) =>
  `https://i.ytimg.com/vi/${id}/${chave}.jpg`;

/** O player, com `nocookie` e começando no segundo pedido. */
export const urlDoPlayer = (id: string, segundo = 0) =>
  `https://www.youtube-nocookie.com/embed/${id}${segundo > 0 ? `?start=${Math.floor(segundo)}` : ""}`;

/**
 * Consulta o oEmbed. Sem chave, com CORS liberado.
 *
 * `maxwidth=1920` melhora o que volta, mas MEDIDO aqui ele não devolve
 * 1920×1080: para um vídeo 16:9 a resposta veio 356×200. O que se aproveita é a
 * PROPORÇÃO (356/200 = 1,78), não a dimensão — e a proporção já responde a
 * pergunta útil, que é se o vídeo é 16:9, 4:3 ou vertical.
 */
export async function consultarOembed(id: string): Promise<VideoDoYoutube | null> {
  const alvo = encodeURIComponent(`https://www.youtube.com/watch?v=${id}`);
  const r = await fetch(`https://www.youtube.com/oembed?url=${alvo}&format=json&maxwidth=1920`);
  if (!r.ok) return null;
  const d = (await r.json()) as {
    title?: string;
    author_name?: string;
    author_url?: string;
    width?: number;
    height?: number;
    thumbnail_url?: string;
  };
  return {
    id,
    titulo: d.title ?? "",
    canal: d.author_name ?? "",
    canalUrl: d.author_url ?? "",
    largura: d.width ?? 0,
    altura: d.height ?? 0,
    miniaturaOembed: d.thumbnail_url ?? "",
  };
}

/**
 * Baixa um quadro do CDN, se ele existir.
 *
 * Usa `fetch` e confere o STATUS — nunca `<img>`. O placeholder de erro do CDN
 * tem exatamente 120×90 e ~1.097 bytes, e passaria por quadro legítimo numa
 * tela que só espera o `onload`.
 */
export async function baixarQuadro(id: string, chave: string): Promise<Uint8Array | null> {
  const r = await fetch(urlDoQuadro(id, chave));
  if (!r.ok) return null;
  const b = new Uint8Array(await r.arrayBuffer());
  // O placeholder cinza é pequeno demais para ser um quadro de verdade.
  if (b.length < 2000) return null;
  return b;
}

/**
 * O FORMATO do vídeo, que é o que a proporção responde de útil.
 *
 * Mostrar "356:200" na tela não diz nada a ninguém — os números do oEmbed são
 * arbitrários. O que importa é se o vídeo é widescreen, antigo ou vertical,
 * porque isso muda onde procurar e o que foi cortado.
 */
export function formatoDoVideo(largura: number, altura: number): string {
  if (!(largura > 0 && altura > 0)) return "desconhecido";
  const r = largura / altura;
  if (r < 0.9) return `vertical (${r.toFixed(2)})`;
  if (Math.abs(r - 1) < 0.06) return "quadrado (1:1)";
  if (Math.abs(r - 4 / 3) < 0.06) return "4:3 (formato antigo)";
  if (Math.abs(r - 16 / 9) < 0.06) return "16:9 (widescreen)";
  if (Math.abs(r - 21 / 9) < 0.15) return "21:9 (cinema)";
  return `${r.toFixed(2)}:1`;
}
