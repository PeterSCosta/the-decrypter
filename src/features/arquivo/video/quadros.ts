/**
 * Quadros de vídeo — a parte pura, para poder testar sem navegador.
 *
 * ── A PRECISÃO DO SEEK, QUE É O PONTO DELICADO ──────────────────────────────
 * Mandar `video.currentTime = 37.5` NÃO garante o quadro do segundo 37,5. O
 * navegador salta para o quadro decodificável mais próximo, e num vídeo com
 * keyframe a cada 2 s isso pode errar mais de um segundo. Quem procura um
 * quadro específico numa prova precisa saber disso, então o painel mostra o
 * `currentTime` REAL depois do seek, ao lado do pedido — e não o número que a
 * pessoa digitou.
 */

export interface Quadro {
  /** Segundo pedido. */
  pedido: number;
  /** Segundo que o vídeo realmente entregou. */
  real: number;
  /** PNG do quadro. */
  bytes: Uint8Array;
  largura: number;
  altura: number;
}

/** `01:23,4` — o formato que uma prova usa para citar um instante. */
export function comoTempo(segundos: number): string {
  const s = Math.max(0, segundos);
  const m = Math.floor(s / 60);
  const resto = s - m * 60;
  return `${String(m).padStart(2, "0")}:${resto.toFixed(1).padStart(4, "0")}`;
}

/**
 * Aceita `37`, `37,5`, `1:23`, `1:23,4` e devolve segundos.
 *
 * A vírgula entra porque a interface é pt-BR e é o que se digita aqui; o ponto
 * continua valendo para quem copiou de outra ferramenta.
 */
export function paraSegundos(texto: string): number | null {
  const t = texto.trim().replace(",", ".");
  if (!t) return null;
  const partes = t.split(":");
  if (partes.length > 2) return null;
  const nums = partes.map(Number);
  if (nums.some((n) => !Number.isFinite(n) || n < 0)) return null;
  const s = nums.length === 2 ? nums[0] * 60 + nums[1] : nums[0];
  return Number.isFinite(s) ? s : null;
}

/** Teto de uma tacada só: cada quadro é um seek, e um seek não é instantâneo. */
export const MAX_INSTANTES = 24;

/**
 * Uma LISTA de instantes: `14, 60, 72, 90`.
 *
 * ── A VÍRGULA É AS DUAS COISAS, E ISSO PRECISA DE REGRA ─────────────────────
 * Em pt-BR a vírgula separa itens (`14, 60`) e também é a casa decimal
 * (`37,5`). Não dá para escolher uma: as duas aparecem de verdade nesta caixa.
 * A regra, em ordem:
 *
 *  • vírgula seguida de espaço, ponto-e-vírgula, espaço e quebra de linha
 *    SEMPRE separam — é o que se digita quando se quer uma lista;
 *  • vírgula colada só separa quando há TRÊS ou mais pedaços (`14,60,72,90`):
 *    ninguém escreve um decimal com três vírgulas;
 *  • com dois pedaços colados (`37,5`), continua sendo decimal.
 *
 * O caso ambíguo de verdade — `14,60` querendo dizer dois quadros — resolve-se
 * do lado de fora: o botão diz quantos quadros vai pegar antes do clique.
 */
export function listaDeInstantes(texto: string): number[] | null {
  const bruto = texto.trim();
  if (!bruto) return null;

  const pedacos = bruto
    .split(/[;\n]+|,\s+|\s+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .flatMap((p) => {
      // Vírgula colada: só vira separador com três ou mais números.
      const partes = p.split(",");
      return partes.length >= 3 && /^\d+(,\d+)+$/.test(p) ? partes : [p];
    });

  const segundos: number[] = [];
  for (const p of pedacos) {
    const s = paraSegundos(p);
    if (s === null) return null;
    segundos.push(s);
  }
  // Ordenado e sem repetido: os seeks andam para a frente, e pedir o mesmo
  // instante duas vezes só devolve a mesma imagem duas vezes.
  return [...new Set(segundos)].sort((a, b) => a - b).slice(0, MAX_INSTANTES);
}

/**
 * Os instantes de uma tira de miniaturas.
 *
 * Evita 0 e a duração exata: o primeiro quadro costuma ser preto (fade-in) e o
 * último pode não existir, e uma tira que começa e termina em preto não ajuda
 * ninguém a achar onde a coisa muda.
 */
export function instantesDaTira(duracao: number, quantos = 12): number[] {
  if (!(duracao > 0) || quantos < 1) return [];
  // Uma miniatura a cada meio segundo, no máximo. Sem esse teto, um vídeo de
  // 0,3 s rendia 8 quadros a 40 ms um do outro — oito vezes a mesma imagem,
  // ocupando a tira que existe justamente para mostrar o que MUDA.
  const n = Math.min(quantos, Math.max(1, Math.floor(duracao / 0.5)));
  const margem = Math.min(0.5, duracao * 0.02);
  const util = duracao - margem * 2;
  if (util <= 0 || n === 1) return [duracao / 2];
  return Array.from({ length: n }, (_, i) => margem + (util * i) / (n - 1));
}
