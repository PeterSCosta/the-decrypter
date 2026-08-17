import { afterEach, describe, expect, it, vi } from "vitest";
import { getToken, setToken } from "./api";
import { identificarMusica } from "./musica";

afterEach(() => {
  vi.unstubAllGlobals();
  setToken(null);
});

describe("envio do trecho", () => {
  it("NÃO define Content-Type — o navegador escreve o boundary", async () => {
    // Definir `application/json` num FormData quebra o upload em silêncio: o
    // servidor recebe um corpo que não sabe separar em campos e responde
    // "mande um arquivo" para quem mandou um.
    let capturado: RequestInit | undefined;
    vi.stubGlobal("fetch", (_u: string, init: RequestInit) => {
      capturado = init;
      return Promise.resolve(
        new Response(JSON.stringify({ reconhecido: false }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    });

    await identificarMusica(new Blob([new Uint8Array(10)]), "trecho.wav");
    const h = new Headers(capturado?.headers);
    expect(h.has("Content-Type")).toBe(false);
    expect(capturado?.body).toBeInstanceOf(FormData);
  });

  it("manda o token quando há sessão", async () => {
    let capturado: RequestInit | undefined;
    vi.stubGlobal("fetch", (_u: string, init: RequestInit) => {
      capturado = init;
      return Promise.resolve(new Response(JSON.stringify({ reconhecido: false }), { status: 200 }));
    });
    setToken("abc123");
    await identificarMusica(new Blob([new Uint8Array(4)]), "t.wav");
    expect(new Headers(capturado?.headers).get("Authorization")).toBe("Bearer abc123");
  });

  it("devolve a ficha quando reconhece", async () => {
    vi.stubGlobal("fetch", () =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            reconhecido: true,
            musica: {
              titulo: "Asa Branca",
              artista: "Luiz Gonzaga",
              album: null,
              lancamento: null,
              timecode: "0:42",
              url: null,
            },
          }),
          { status: 200 },
        ),
      ),
    );
    const r = await identificarMusica(new Blob([new Uint8Array(4)]), "t.wav");
    expect(r.reconhecido).toBe(true);
    if (r.reconhecido) {
      expect(r.musica.titulo).toBe("Asa Branca");
      // O timecode é o que permite juntar dois trechos vizinhos da mesma faixa.
      expect(r.musica.timecode).toBe("0:42");
    }
  });
});

describe("guarda do token", () => {
  it("sobrevive ao localStorage bloqueado — modo privado", async () => {
    // O `catch` prometia "a sessão vale enquanto a aba estiver aberta" e não
    // entregava: sem guarda em memória, `getToken` devolvia null logo depois do
    // login e a pessoa era deslogada sem entender por quê.
    const real = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get() {
        throw new Error("storage bloqueado");
      },
    });
    try {
      setToken("token-em-memoria");
      expect(getToken()).toBe("token-em-memoria");
      setToken(null);
      expect(getToken()).toBeNull();
    } finally {
      if (real) Object.defineProperty(globalThis, "localStorage", real);
    }
  });
});
