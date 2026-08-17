/**
 * FFT radix-2 iterativa, no lugar (in-place).
 *
 * Escrita à mão em vez de dependência: são ~70 linhas, e a alternativa (`fft.js`,
 * 2,7 KB gz) só ganha 3× num trecho que já roda abaixo de um segundo. A regra do
 * projeto é não arrastar pacote para o bundle sem ganho visível.
 *
 * As tabelas de seno/cosseno e a permutação de bits são memoizadas por tamanho: a
 * mesma STFT chama isto milhares de vezes com o MESMO N, e recalcular
 * `Math.cos` 11 mil vezes por eixo é o tipo de desperdício que não aparece no
 * perfil porque está espalhado.
 */

interface Tabelas {
  cos: Float64Array;
  sen: Float64Array;
  reverso: Uint32Array;
}

const cache = new Map<number, Tabelas>();

function tabelas(n: number): Tabelas {
  const guardado = cache.get(n);
  if (guardado) return guardado;

  const metade = n >> 1;
  const cos = new Float64Array(metade);
  const sen = new Float64Array(metade);
  for (let i = 0; i < metade; i++) {
    cos[i] = Math.cos((-2 * Math.PI * i) / n);
    sen[i] = Math.sin((-2 * Math.PI * i) / n);
  }

  // Permutação por inversão de bits, calculada uma vez.
  const bits = Math.log2(n);
  const reverso = new Uint32Array(n);
  for (let i = 0; i < n; i++) {
    let r = 0;
    for (let b = 0; b < bits; b++) r |= ((i >> b) & 1) << (bits - 1 - b);
    reverso[i] = r;
  }

  const t = { cos, sen, reverso };
  cache.set(n, t);
  return t;
}

/** `n` tem de ser potência de 2 — a radix-2 não aceita outra coisa. */
export function ehPotenciaDeDois(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0;
}

/**
 * Transforma no lugar. `re` e `im` têm o mesmo comprimento, potência de 2.
 * Para sinal real, passe `im` zerado.
 */
export function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  if (!ehPotenciaDeDois(n)) throw new Error(`FFT exige potência de 2, recebi ${n}`);
  if (im.length !== n) throw new Error("re e im têm de ter o mesmo tamanho");
  if (n === 1) return;

  const { cos, sen, reverso } = tabelas(n);

  // Reordena por inversão de bits. A guarda `i < r` evita desfazer a troca.
  for (let i = 0; i < n; i++) {
    const r = reverso[i];
    if (i < r) {
      let t = re[i];
      re[i] = re[r];
      re[r] = t;
      t = im[i];
      im[i] = im[r];
      im[r] = t;
    }
  }

  // Borboletas, de blocos de 2 até n.
  for (let tam = 2; tam <= n; tam <<= 1) {
    const meio = tam >> 1;
    const passo = n / tam;
    for (let i = 0; i < n; i += tam) {
      for (let j = 0, k = 0; j < meio; j++, k += passo) {
        const c = cos[k];
        const s = sen[k];
        const a = i + j;
        const b = a + meio;
        const tre = re[b] * c - im[b] * s;
        const tim = re[b] * s + im[b] * c;
        re[b] = re[a] - tre;
        im[b] = im[a] - tim;
        re[a] += tre;
        im[a] += tim;
      }
    }
  }
}

/**
 * Magnitude dos bins úteis (0..n/2) de um sinal REAL.
 *
 * A metade de cima do espectro de um sinal real é o espelho conjugado da de
 * baixo — devolvê-la seria entregar a mesma informação duas vezes e dobrar o
 * custo de tudo que vem depois.
 */
export function magnitudes(amostras: Float64Array): Float64Array {
  const n = amostras.length;
  const re = Float64Array.from(amostras);
  const im = new Float64Array(n);
  fft(re, im);
  const saida = new Float64Array(n / 2 + 1);
  for (let i = 0; i < saida.length; i++) saida[i] = Math.hypot(re[i], im[i]);
  return saida;
}

/** Janela de Hann, memoizada. Reduz o vazamento entre bins. */
const janelas = new Map<number, Float64Array>();
export function hann(n: number): Float64Array {
  const guardada = janelas.get(n);
  if (guardada) return guardada;
  const w = new Float64Array(n);
  for (let i = 0; i < n; i++) w[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1)));
  janelas.set(n, w);
  return w;
}

/**
 * Goertzel — energia numa ÚNICA frequência, sem FFT.
 *
 * É o que serve para DTMF e para procurar uma portadora conhecida: custa O(n)
 * por frequência, contra O(n log n) da FFT inteira. Com 8 frequências (as do
 * DTMF) sai muito mais barato, e sem a quantização em bins — a frequência
 * procurada não precisa cair no centro de um bin.
 */
export function goertzel(amostras: Float64Array, taxa: number, frequencia: number): number {
  const n = amostras.length;
  const k = Math.round((n * frequencia) / taxa);
  const w = (2 * Math.PI * k) / n;
  const coef = 2 * Math.cos(w);
  let s0 = 0;
  let s1 = 0;
  let s2 = 0;
  for (let i = 0; i < n; i++) {
    s0 = amostras[i] + coef * s1 - s2;
    s2 = s1;
    s1 = s0;
  }
  return Math.sqrt(s1 * s1 + s2 * s2 - coef * s1 * s2);
}
