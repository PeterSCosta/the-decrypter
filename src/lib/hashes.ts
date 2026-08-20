/**
 * MD5, SHA-1, SHA-256 e CRC-32 — SÍNCRONOS, e é por isso que estão aqui.
 *
 * ── POR QUE NÃO O `crypto.subtle` DO NAVEGADOR ─────────────────────────────
 * Ele é assíncrono (devolve `Promise`) e não tem MD5 nem CRC-32. O `decode()`
 * de um decoder é síncrono por contrato — o fan-out roda os 126 na mesma tecla e
 * não espera ninguém —, então uma verificação de hash que dependesse de
 * `await` simplesmente não caberia no leque.
 *
 * ── E POR QUE ESCREVER À MÃO É SEGURO AQUI ─────────────────────────────────
 * Não é criptografia: é COMPARAÇÃO. A prova dá um hash, a pessoa dá um
 * candidato, e a bancada diz se batem. Não há segredo a proteger, não há
 * atacante, não há canal lateral que importe. E cada uma das quatro é conferida
 * contra o `node:crypto` no teste — implementação errada reprova no primeiro
 * vetor.
 *
 * ── O QUE ISTO PERMITE, E É O PONTO ────────────────────────────────────────
 * Verificação de hash é a única família desta bancada com **risco zero de
 * resposta errada**: bate ou não bate. Não há nota, não há palpite, não há
 * ordenação por evidência — há sim ou não.
 */

const utf8 = (s: string) => new TextEncoder().encode(s);

const hex = (bytes: Uint8Array | number[]) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

// ── CRC-32 ───────────────────────────────────────────────────────────────────

/** Tabela do polinômio 0xEDB88320, montada uma vez. */
const CRC_TABELA = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(texto: string): string {
  let c = 0xffffffff;
  for (const b of utf8(texto)) c = CRC_TABELA[(c ^ b) & 0xff] ^ (c >>> 8);
  return ((c ^ 0xffffffff) >>> 0).toString(16).padStart(8, "0");
}

// ── MD5 ──────────────────────────────────────────────────────────────────────

const MD5_S = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14,
  20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6,
  10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
];
const MD5_K = Uint32Array.from({ length: 64 }, (_, i) =>
  Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32),
);

const rotl = (x: number, n: number) => ((x << n) | (x >>> (32 - n))) >>> 0;

export function md5(texto: string): string {
  const msg = utf8(texto);
  const bitLen = msg.length * 8;
  // Padding: 0x80, zeros, e o comprimento em 64 bits little-endian.
  const total = ((msg.length + 8) >> 6) * 64 + 64;
  const buf = new Uint8Array(total);
  buf.set(msg);
  buf[msg.length] = 0x80;
  const dv = new DataView(buf.buffer);
  dv.setUint32(total - 8, bitLen >>> 0, true);
  dv.setUint32(total - 4, Math.floor(bitLen / 2 ** 32), true);

  let [a0, b0, c0, d0] = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476];

  for (let bloco = 0; bloco < total; bloco += 64) {
    const M = new Uint32Array(16);
    for (let i = 0; i < 16; i++) M[i] = dv.getUint32(bloco + i * 4, true);

    let [A, B, C, D] = [a0, b0, c0, d0];
    for (let i = 0; i < 64; i++) {
      let F: number;
      let g: number;
      if (i < 16) {
        F = (B & C) | (~B & D);
        g = i;
      } else if (i < 32) {
        F = (D & B) | (~D & C);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        F = B ^ C ^ D;
        g = (3 * i + 5) % 16;
      } else {
        F = C ^ (B | ~D);
        g = (7 * i) % 16;
      }
      F = (F + A + MD5_K[i] + M[g]) >>> 0;
      A = D;
      D = C;
      C = B;
      B = (B + rotl(F, MD5_S[i])) >>> 0;
    }
    a0 = (a0 + A) >>> 0;
    b0 = (b0 + B) >>> 0;
    c0 = (c0 + C) >>> 0;
    d0 = (d0 + D) >>> 0;
  }

  const out = new Uint8Array(16);
  const ov = new DataView(out.buffer);
  ov.setUint32(0, a0, true);
  ov.setUint32(4, b0, true);
  ov.setUint32(8, c0, true);
  ov.setUint32(12, d0, true);
  return hex(out);
}

// ── SHA-1 ────────────────────────────────────────────────────────────────────

export function sha1(texto: string): string {
  const msg = utf8(texto);
  const bitLen = msg.length * 8;
  const total = ((msg.length + 8) >> 6) * 64 + 64;
  const buf = new Uint8Array(total);
  buf.set(msg);
  buf[msg.length] = 0x80;
  const dv = new DataView(buf.buffer);
  // SHA usa big-endian, ao contrário do MD5.
  dv.setUint32(total - 8, Math.floor(bitLen / 2 ** 32));
  dv.setUint32(total - 4, bitLen >>> 0);

  const h = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0];

  const w = new Uint32Array(80);
  for (let bloco = 0; bloco < total; bloco += 64) {
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(bloco + i * 4);
    for (let i = 16; i < 80; i++) w[i] = rotl(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1);

    let [a, b, c, d, e] = h;
    for (let i = 0; i < 80; i++) {
      let f: number;
      let k: number;
      if (i < 20) {
        f = (b & c) | (~b & d);
        k = 0x5a827999;
      } else if (i < 40) {
        f = b ^ c ^ d;
        k = 0x6ed9eba1;
      } else if (i < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8f1bbcdc;
      } else {
        f = b ^ c ^ d;
        k = 0xca62c1d6;
      }
      const tmp = (rotl(a, 5) + f + e + k + w[i]) >>> 0;
      e = d;
      d = c;
      c = rotl(b, 30);
      b = a;
      a = tmp;
    }
    h[0] = (h[0] + a) >>> 0;
    h[1] = (h[1] + b) >>> 0;
    h[2] = (h[2] + c) >>> 0;
    h[3] = (h[3] + d) >>> 0;
    h[4] = (h[4] + e) >>> 0;
  }
  return h.map((n) => n.toString(16).padStart(8, "0")).join("");
}

// ── SHA-256 ──────────────────────────────────────────────────────────────────

const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

const rotr = (x: number, n: number) => ((x >>> n) | (x << (32 - n))) >>> 0;

export function sha256(texto: string): string {
  const msg = utf8(texto);
  const bitLen = msg.length * 8;
  const total = ((msg.length + 8) >> 6) * 64 + 64;
  const buf = new Uint8Array(total);
  buf.set(msg);
  buf[msg.length] = 0x80;
  const dv = new DataView(buf.buffer);
  dv.setUint32(total - 8, Math.floor(bitLen / 2 ** 32));
  dv.setUint32(total - 4, bitLen >>> 0);

  const h = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];

  const w = new Uint32Array(64);
  for (let bloco = 0; bloco < total; bloco += 64) {
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(bloco + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + S1 + ch + SHA256_K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      hh = g;
      g = f;
      f = e;
      e = (d + t1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) >>> 0;
    }
    const soma = [a, b, c, d, e, f, g, hh];
    for (let i = 0; i < 8; i++) h[i] = (h[i] + soma[i]) >>> 0;
  }
  return h.map((n) => n.toString(16).padStart(8, "0")).join("");
}

// ── A tabela que o decoder usa ───────────────────────────────────────────────

export const ALGORITMOS: { nome: string; hex: number; fn: (s: string) => string }[] = [
  { nome: "CRC-32", hex: 8, fn: crc32 },
  { nome: "MD5", hex: 32, fn: md5 },
  { nome: "SHA-1", hex: 40, fn: sha1 },
  { nome: "SHA-256", hex: 64, fn: sha256 },
];
