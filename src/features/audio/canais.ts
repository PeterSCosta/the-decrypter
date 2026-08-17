/**
 * A camada dos CANAIS — o pedido original, e a que revela o truque mais barato
 * de todos: uma mensagem que existe só no canal direito, ou só na diferença
 * entre os dois.
 *
 * Uma mensagem gravada em ANTIFASE (idêntica nos dois canais, com o sinal
 * invertido em um deles) some por completo quando o áudio é somado para mono —
 * que é o que qualquer caixa de som de celular faz. Ela vive inteira em
 * `(E − D) / 2`, o canal "side". É por isso que o side não é um extra: é a
 * vista onde esse esconderijo aparece.
 */

export interface MetricasDeCanal {
  estereo: boolean;
  /** Correlação de Pearson entre E e D: 1 = idênticos, −1 = antifase, 0 = independentes. */
  correlacao: number;
  /** Energia do side em relação ao mid, em dB. Muito baixo = estéreo falso. */
  sideMidDb: number;
  /** Maior diferença absoluta amostra a amostra. Zero = canais idênticos bit a bit. */
  maiorDiferenca: number;
  /** Pico de cada canal, em dBFS. */
  picoEsquerdoDb: number;
  picoDireitoDb: number;
  /** O que isto sugere, em pt-BR — descrição, não veredito. */
  leitura: string;
}

const dbfs = (amplitude: number): number =>
  amplitude <= 0 ? Number.NEGATIVE_INFINITY : 20 * Math.log10(amplitude);

function pico(x: Float32Array): number {
  let m = 0;
  for (const v of x) {
    const a = v < 0 ? -v : v;
    if (a > m) m = a;
  }
  return m;
}

function energia(x: Float32Array): number {
  let s = 0;
  for (const v of x) s += v * v;
  return s;
}

/** `(E + D) / 2` — o que sobra quando o áudio é somado para mono. */
export function mid(e: Float32Array, d: Float32Array): Float32Array {
  const n = Math.min(e.length, d.length);
  const saida = new Float32Array(n);
  for (let i = 0; i < n; i++) saida[i] = (e[i] + d[i]) / 2;
  return saida;
}

/**
 * `(E − D) / 2` — o canal lateral.
 *
 * Tudo que é igual nos dois canais se cancela; sobra só o que os diferencia. É
 * aqui que aparece a mensagem em antifase, e é aqui que se ouve o que a soma
 * para mono apaga.
 */
export function side(e: Float32Array, d: Float32Array): Float32Array {
  const n = Math.min(e.length, d.length);
  const saida = new Float32Array(n);
  for (let i = 0; i < n; i++) saida[i] = (e[i] - d[i]) / 2;
  return saida;
}

/** Correlação de Pearson, sem materializar arrays intermediários. */
export function correlacao(e: Float32Array, d: Float32Array): number {
  const n = Math.min(e.length, d.length);
  if (n === 0) return 0;
  let somaE = 0;
  let somaD = 0;
  for (let i = 0; i < n; i++) {
    somaE += e[i];
    somaD += d[i];
  }
  const mE = somaE / n;
  const mD = somaD / n;
  let num = 0;
  let varE = 0;
  let varD = 0;
  for (let i = 0; i < n; i++) {
    const a = e[i] - mE;
    const b = d[i] - mD;
    num += a * b;
    varE += a * a;
    varD += b * b;
  }
  const den = Math.sqrt(varE * varD);
  return den === 0 ? 0 : num / den;
}

/**
 * Mede a relação entre os canais e descreve o que ela sugere.
 *
 * A `leitura` é deliberadamente descritiva ("os canais são idênticos bit a bit")
 * e não conclusiva ("não há mensagem"): um arquivo mono duplicado não prova
 * ausência de esconderijo, prova apenas que ele não está NESTA camada.
 */
export function medirCanais(canais: Float32Array[]): MetricasDeCanal {
  if (canais.length < 2) {
    const p = canais.length ? pico(canais[0]) : 0;
    return {
      estereo: false,
      correlacao: 1,
      sideMidDb: Number.NEGATIVE_INFINITY,
      maiorDiferenca: 0,
      picoEsquerdoDb: dbfs(p),
      picoDireitoDb: dbfs(p),
      leitura: "Arquivo mono — não há segundo canal onde esconder nada.",
    };
  }

  const [e, d] = canais;
  const n = Math.min(e.length, d.length);
  let maiorDiferenca = 0;
  for (let i = 0; i < n; i++) {
    const dif = Math.abs(e[i] - d[i]);
    if (dif > maiorDiferenca) maiorDiferenca = dif;
  }

  const m = mid(e, d);
  const s = side(e, d);
  const energiaMid = energia(m);
  const energiaSide = energia(s);
  const sideMidDb = energiaMid === 0 ? 0 : 10 * Math.log10((energiaSide + 1e-30) / energiaMid);
  const r = correlacao(e, d);

  let leitura: string;
  if (maiorDiferenca === 0) {
    leitura = "Os dois canais são idênticos bit a bit — estéreo falso, um mono duplicado.";
  } else if (r < -0.9) {
    // O caso que motiva tudo isto: some no mono, vive inteiro no side.
    leitura =
      "Os canais estão em OPOSIÇÃO DE FASE (correlação muito negativa). Somado para mono, este áudio se cancela — ouça o canal Diferença.";
  } else if (sideMidDb < -60) {
    leitura = `O canal lateral é ${Math.abs(Math.round(sideMidDb))} dB mais fraco que o central: os canais quase não diferem.`;
  } else if (r < 0.3) {
    leitura = "Os canais têm conteúdo bem diferente entre si — vale ouvir cada um em separado.";
  } else {
    leitura = `Estéreo comum (correlação ${r.toFixed(2)}, lateral ${Math.round(sideMidDb)} dB abaixo do central).`;
  }

  return {
    estereo: true,
    correlacao: r,
    sideMidDb,
    maiorDiferenca,
    picoEsquerdoDb: dbfs(pico(e)),
    picoDireitoDb: dbfs(pico(d)),
    leitura,
  };
}
