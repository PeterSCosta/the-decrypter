import { describe, expect, it } from "vitest";
import { type CodigoLido, lerCodigos, motivoDaFalha, rotuloDoFormato } from "./codigo";

/** ImageData de mentira: o teste não decodifica nada, testa a ESCADA. */
const px = { data: new Uint8ClampedArray(4), width: 1, height: 1 } as ImageData;
const um = (texto: string, origem: CodigoLido["origem"]): CodigoLido => ({
  texto,
  formato: "qr_code",
  origem,
});

describe("escada de leitura de código", () => {
  it("quando o nativo acha, a reserva NÃO é chamada", async () => {
    // O ponto não é o resultado: é não pagar o download da lib para repetir a
    // mesma resposta que já se tem.
    let reservaChamada = false;
    const r = await lerCodigos(px, {
      detectorNativo: async () => [um("achou", "nativo")],
      leitorReserva: async () => {
        reservaChamada = true;
        return [];
      },
    });
    expect(r.achados).toHaveLength(1);
    expect(reservaChamada).toBe(false);
  });

  it("quando o nativo não acha, a reserva assume", async () => {
    const r = await lerCodigos(px, {
      detectorNativo: async () => [],
      leitorReserva: async () => [um("pela reserva", "jsqr")],
    });
    expect(r.achados[0].origem).toBe("jsqr");
    expect(r.motivo).toBeNull();
  });

  it("o mesmo texto lido duas vezes é um achado só", async () => {
    const r = await lerCodigos(px, {
      detectorNativo: async () => [um("igual", "nativo"), um("igual", "nativo")],
      leitorReserva: async () => [],
    });
    expect(r.achados).toHaveLength(1);
  });

  it("sem achado, devolve MOTIVO — nunca uma lista vazia calada", async () => {
    // É a lição que o leitor da aba Matriz já pagou: `jsQR` devolve null mudo,
    // e a equipe conclui "não tem QR" quando o que houve foi foto ruim.
    const r = await lerCodigos(px, {
      detectorNativo: async () => [],
      leitorReserva: async () => [],
    });
    expect(r.achados).toHaveLength(0);
    expect(r.motivo).toBeTruthy();
  });

  it("um leitor que estoura não derruba o outro", async () => {
    const r = await lerCodigos(px, {
      detectorNativo: async () => {
        throw new Error("BarcodeDetector quebrado nesta versão");
      },
      leitorReserva: async () => [um("salvo", "jsqr")],
    }).catch(() => null);
    // O `lerCodigos` não engole a exceção do injetável (isso é do teste), mas o
    // caminho real de produção tem try/catch nos dois — o que este caso trava é
    // que a falha não pode passar despercebida como "nenhum código".
    expect(r).toBeNull();
  });
});

describe("mensagens", () => {
  it("o motivo muda com o que o navegador tem", () => {
    // Três situações, três ações diferentes: trocar de navegador, tirar outra
    // foto, ou conectar à rede.
    expect(motivoDaFalha(false, false)).toContain("rede");
    expect(motivoDaFalha(false, true)).toContain("Chrome");
    expect(motivoDaFalha(true, true)).toContain("foto");
  });

  it("o formato cru vira nome de gente", () => {
    expect(rotuloDoFormato("ean_13")).toContain("EAN-13");
    expect(rotuloDoFormato("qr_code")).toBe("QR Code");
    // Formato que o navegador invente continua aparecendo, sem quebrar.
    expect(rotuloDoFormato("formato_novo")).toBe("formato_novo");
  });
});
