import { mapDecoder } from "../define";

/**
 * Base36 — um NÚMERO escrito com 0-9 e A-Z.
 *
 * Não confundir com Base32/Base58/Base64, que são binário→texto: aqui a cadeia
 * é um inteiro só, na base 36. É o formato compacto de identificador (o
 * `Number.toString(36)` do JS), e em prova costuma aparecer como um código curto
 * que vira uma data, uma coordenada ou um número de lei.
 *
 * `BigInt` e não `Number`: em 11 caracteres a base 36 já passa de
 * `Number.MAX_SAFE_INTEGER`, e o resultado sairia arredondado — errado sem
 * avisar, que é o pior tipo de resposta nesta bancada.
 */
const VALIDO = /^[0-9a-z]+$/i;

export const decoders = mapDecoder({
  id: "base36",
  name: "Base36 (número)",
  category: "encoding",
  decode(input) {
    const s = input.trim();
    if (s.length < 2 || s.length > 64 || !VALIDO.test(s)) return null;
    // Só dígitos já é decimal: o conversor de base cobre, e emitir aqui seria
    // repetir o mesmo card com outro rótulo.
    if (/^\d+$/.test(s)) return null;
    // Sem nenhuma letra depois de "A"..."Z" o palpite é fraco demais; exigir ao
    // menos uma letra evita disparar em qualquer sigla de duas letras.
    if (!/[a-z]/i.test(s)) return null;

    let n = 0n;
    for (const c of s.toLowerCase()) {
      const d = c >= "0" && c <= "9" ? c.charCodeAt(0) - 48 : c.charCodeAt(0) - 87;
      n = n * 36n + BigInt(d);
    }

    return {
      output: n.toString(10),
      // Abaixo de qualquer consulta a base de dados: toda palavra em [a-z0-9] é
      // um Base36 válido, então isto acerta por acaso o tempo todo. É útil como
      // ideia, nunca como resposta provável.
      forcedScore: 0.3,
    };
  },
});
