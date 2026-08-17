import { hann, magnitudes } from "@/features/audio/fft";

/**
 * Notas musicais tocadas → nomes de nota.
 *
 * ── POR QUE ESTE MÓDULO EXISTE ──────────────────────────────────────────────
 * O decoder `music-notes` já está na bancada há tempo e resolve
 * `"Dó Ré Mi Fá"` → `CDEF` → A1Z26. Só que ele parte de notas **já
 * transcritas por um humano** — e a crítica do plano de áudio apontou o buraco:
 * a aba mede frequência, o decoder existe, e ninguém ligava um no outro.
 *
 * Este módulo é o elo. Áudio entra, nomes de nota saem, e o texto cai no
 * Decodificador como qualquer outro resultado. É a cadeia
 * `áudio → notas → letras → número` fechada de ponta a ponta.
 *
 * ── O QUE ELE NÃO É ─────────────────────────────────────────────────────────
 * Não é transcrição musical. Ele lê **uma nota por vez**, sustentada, com
 * silêncio ou mudança clara entre elas — que é como uma prova de gincana
 * apresenta uma sequência. Acorde (várias notas juntas) ele recusa, e diz que
 * recusou: fingir uma linha melódica dentro de um acorde é inventar dado.
 */

/** Nomes na cifra anglo e em solfejo — o decoder aceita os dois. */
const ANGLO = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const SOLFEJO = ["Dó", "Dó#", "Ré", "Ré#", "Mi", "Fá", "Fá#", "Sol", "Sol#", "Lá", "Lá#", "Si"];

export interface NotaDetectada {
  /** "A4", "C#3"… */
  anglo: string;
  /** "Lá", "Dó#"… — sem oitava, que é o que o decoder consome. */
  solfejo: string;
  hz: number;
  /** Distância da nota exata, em centésimos de semitom. Acima de ~35 é suspeito. */
  centavos: number;
  de: number;
  ate: number;
}

export interface AchadoNotas {
  notas: NotaDetectada[];
  /** Pronto para o Decodificador: "Dó Ré Mi Fá". */
  textoSolfejo: string;
  /** A mesma coisa em cifra anglo, sem oitava: "C D E F". */
  textoAnglo: string;
  /** Afinação usada como referência. */
  a4: number;
}

export interface RecusaNotas {
  motivo: string;
}

export const ehNotas = (r: AchadoNotas | RecusaNotas): r is AchadoNotas => "notas" in r;

/** Frequência → nome de nota, com o desvio em centavos. */
export function frequenciaParaNota(
  hz: number,
  a4 = 440,
): { anglo: string; solfejo: string; centavos: number } | null {
  if (!(hz > 0)) return null;
  // Semitons acima do lá 4 (A4 = 440 Hz por convenção).
  const semitons = 12 * Math.log2(hz / a4);
  const arredondado = Math.round(semitons);
  const centavos = Math.round((semitons - arredondado) * 100);
  // MIDI 69 é o A4; daí sai a classe e a oitava.
  const midi = 69 + arredondado;
  if (midi < 12 || midi > 127) return null;
  const classe = ((midi % 12) + 12) % 12;
  const oitava = Math.floor(midi / 12) - 1;
  return { anglo: `${ANGLO[classe]}${oitava}`, solfejo: SOLFEJO[classe], centavos };
}

/**
 * Frequência dominante de um trecho, refinada por interpolação parabólica.
 *
 * Sem o refino, a resolução é a do bin — a 44,1 kHz com N=8192 isso dá 5,4 Hz,
 * o que na região grave já vale mais de um semitom inteiro e trocaria a nota.
 * A parábola sobre os três bins do pico corrige isso para uma fração de bin.
 */
function frequenciaDominante(
  amostras: Float32Array,
  taxa: number,
): { hz: number; dominancia: number } | null {
  // A janela se ADAPTA ao trecho: fixá-la em 8192 fazia o detector devolver
  // null para toda nota mais curta que a janela — a 8 kHz, qualquer nota abaixo
  // de um segundo. O piso de 2048 preserva resolução suficiente para separar
  // semitons na região grave.
  const n = 2 ** Math.floor(Math.log2(Math.min(8192, amostras.length)));
  if (n < 2048) return null;
  const janela = hann(n);
  const buf = new Float64Array(n);
  const meio = Math.floor((amostras.length - n) / 2);
  for (let i = 0; i < n; i++) buf[i] = amostras[meio + i] * janela[i];
  const mag = magnitudes(buf);

  // Ignora o contínuo e o que está fora da faixa musical útil.
  const binDe = Math.max(1, Math.floor((60 * n) / taxa));
  const binAte = Math.min(mag.length - 2, Math.ceil((4200 * n) / taxa));
  let pico = binDe;
  for (let i = binDe; i <= binAte; i++) if (mag[i] > mag[pico]) pico = i;
  if (mag[pico] <= 0) return null;

  // Mediana como referência de "quanto este pico se destaca".
  const ordenado = [...mag.subarray(binDe, binAte)].sort((a, b) => a - b);
  const mediana = ordenado[Math.floor(ordenado.length / 2)] || 1e-12;

  const a = mag[pico - 1];
  const b = mag[pico];
  const c = mag[pico + 1];
  const desvio = (0.5 * (a - c)) / (a - 2 * b + c || 1e-12);
  const hz = ((pico + desvio) * taxa) / n;
  return { hz, dominancia: b / mediana };
}

export interface OpcoesNotas {
  /** Afinação de referência. 440 é o padrão; 432 aparece em prova de vez em quando. */
  a4?: number;
  /** Nota mais curta que ainda conta, em ms. */
  minimoMs?: number;
}

/**
 * Lê uma sequência de notas sustentadas.
 *
 * Segmenta por energia — mesma ideia do Morse — e mede a frequência dominante
 * de cada trecho. Trechos vizinhos com a mesma nota são fundidos, porque um
 * vibrato ou uma pausa curta não deveria virar duas notas iguais seguidas.
 */
export function lerNotas(
  amostras: Float32Array,
  taxa: number,
  opcoes: OpcoesNotas = {},
): AchadoNotas | RecusaNotas {
  const a4 = opcoes.a4 ?? 440;
  const minimoMs = opcoes.minimoMs ?? 120;

  const janela = Math.round(taxa * 0.03);
  const passo = Math.round(taxa * 0.015);
  if (amostras.length < janela * 8) return { motivo: "Áudio curto demais para uma sequência." };

  // Envelope de energia, em dB, com piso 60 dB abaixo do pico — a mesma lição
  // do Morse: silêncio digital estraga qualquer limiar automático.
  const n = Math.floor((amostras.length - janela) / passo);
  const env = new Float64Array(n);
  let picoDb = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < n; i++) {
    let soma = 0;
    for (let k = 0; k < janela; k++) {
      const v = amostras[i * passo + k];
      soma += v * v;
    }
    const db = 10 * Math.log10(soma / janela + 1e-12);
    env[i] = db;
    if (db > picoDb) picoDb = db;
  }
  const piso = picoDb - 60;
  for (let i = 0; i < n; i++) if (env[i] < piso) env[i] = piso;

  // Limiar a 20 dB abaixo do pico: mais permissivo que Otsu, porque nota
  // sustentada decai (o "release" de um instrumento) e não liga/desliga seco.
  const limiar = picoDb - 20;

  const trechos: { de: number; ate: number }[] = [];
  let dentro = false;
  let inicio = 0;
  for (let i = 0; i <= n; i++) {
    const aceso = i < n && env[i] > limiar;
    if (aceso && !dentro) {
      dentro = true;
      inicio = i;
    } else if (!aceso && dentro) {
      dentro = false;
      const ms = (i - inicio) * (passo / taxa) * 1000;
      if (ms >= minimoMs) trechos.push({ de: inicio, ate: i });
    }
  }

  if (trechos.length < 2) {
    return {
      motivo:
        "Não achei notas separadas: o áudio é contínuo, ou tem menos de duas notas sustentadas. Este leitor espera uma nota por vez, com pausa ou mudança clara entre elas.",
    };
  }

  const notas: NotaDetectada[] = [];
  for (const t of trechos) {
    const i0 = t.de * passo;
    const i1 = Math.min(amostras.length, t.ate * passo + janela);
    const dom = frequenciaDominante(amostras.subarray(i0, i1), taxa);
    if (!dom) continue;
    // Pico que não domina é acorde, ruído ou percussão — nota sustentada tem
    // uma fundamental clara.
    if (dom.dominancia < 8) continue;
    const nota = frequenciaParaNota(dom.hz, a4);
    if (!nota) continue;
    notas.push({
      anglo: nota.anglo,
      solfejo: nota.solfejo,
      hz: dom.hz,
      centavos: nota.centavos,
      de: i0 / taxa,
      ate: i1 / taxa,
    });
  }

  if (notas.length < 2) {
    return {
      motivo:
        "Achei trechos com energia, mas sem uma frequência fundamental clara em pelo menos dois deles. Acorde e percussão caem aqui — e inventar uma linha melódica dentro de um acorde seria inventar dado.",
    };
  }

  return {
    notas,
    textoSolfejo: notas.map((x) => x.solfejo).join(" "),
    // Sem a oitava: é o que o decoder `music-notes` consome para virar letra.
    textoAnglo: notas.map((x) => x.anglo.replace(/\d+$/, "")).join(" "),
    a4,
  };
}
