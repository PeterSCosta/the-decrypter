import { chaveDv } from "@/features/reference/chave-nfe";
import type { CodeHit } from "@/features/reference/phone-codes";
import { describe, expect, it } from "vitest";
import type { DecodeContext } from "../types";
import { decoders as chave } from "./chave-nfe";

const ctx: DecodeContext = { key: "", streets: null, ceps: null };
const decode = (input: string) => chave.decode(input, ctx);
const campos = (input: string) => decode(input)[0].data as CodeHit[];

// Chave publicada pela NS Tecnologia no artigo do dígito verificador. O mód-11
// (pesos 2–9 da direita) sobre as 43 primeiras posições dá soma 489, resto 5,
// DV = 11 − 5 = 6 — recalculado aqui, não copiado.
const NFE = "43171207364617000135550000000120141000120146";
// CF-e-SAT (modelo 59), que troca série/número/tpEmis por nserieSAT + nCF.
const SAT = "35180164056526000176590000024440030613622964";
// Chave montada aqui com CNPJ alfanumérico válido (12ABC34501DE35): SC,
// julho/2026, NF-e nº 1.234, série 1. DV calculado com ASCII−48 nas letras.
const ALFA = "42260712ABC34501DE35550010000012341123456785";

describe("Chave de acesso (NF-e)", () => {
  it("fatia os nove campos da chave da NS Tecnologia", () => {
    const c = decode(NFE)[0];
    expect(c).toBeDefined();
    expect(c.decoderName).toBe("Chave de acesso (NF-e)");
    expect(c.render).toBe("code-list");
    expect(c.label).toBe("RS · 12/2017");

    const f = campos(NFE);
    expect(f).toHaveLength(9);
    expect(f[0].name).toBe("cUF 43 — Rio Grande do Sul (RS)");
    expect(f[1].name).toBe("AAMM 1712 — dezembro de 2017");
    expect(f[2].name).toBe("CNPJ 07.364.617/0001-35");
    expect(f[3].name).toBe("mod 55 — NF-e, Nota Fiscal Eletrônica");
    expect(f[4].name).toBe("série 0");
    expect(f[5].name).toBe("nNF 12.014");
    expect(f[6].name).toBe("tpEmis 1 — emissão normal");
    expect(f[7].name).toBe("cNF 00012014");
    expect(f[8].name).toBe("cDV 6 — confere (módulo 11)");
  });

  it("o CNPJ do emitente encadeia para o decoder `documento`", () => {
    expect(decode(NFE)[0].chainValue).toBe("07364617000135");
  });

  it("aceita a chave em blocos de quatro e com o prefixo do Id do XML", () => {
    const blocos = NFE.replace(/(.{4})/g, "$1 ").trim();
    expect(decode(blocos)[0]?.output).toBe(decode(NFE)[0].output);
    expect(decode(`NFe${NFE}`)[0]?.chainValue).toBe("07364617000135");
  });

  it("o CF-e-SAT (modelo 59) usa o corte próprio: nserieSAT + nCF", () => {
    const f = campos(SAT);
    expect(f).toHaveLength(8);
    expect(f[3].name).toContain("mod 59 — CF-e-SAT");
    expect(f[4].name).toBe("nserieSAT 000002444");
    expect(f[5].name).toBe("nCF 3.061");
    expect(f[6].name).toBe("cNF 362296");
    expect(f[7].name).toBe("cDV 4 — confere (módulo 11)");
  });

  it("lê o CNPJ alfanumérico de 2026 nas posições 7–20", () => {
    const c = decode(ALFA)[0];
    expect(c).toBeDefined();
    expect(c.chainValue).toBe("12ABC34501DE35");
    expect(campos(ALFA)[2].name).toBe("CNPJ 12.ABC.345/01DE-35 (alfanumérico)");
    expect(campos(ALFA)[1].name).toBe("AAMM 2607 — julho de 2026");
  });

  it("tpEmis de contingência não invalida a leitura", () => {
    // Mesma chave, tpEmis 9 (NFC-e off-line): só o DV precisa ser refeito.
    const base = `${NFE.slice(0, 34)}9${NFE.slice(35, 43)}`;
    const f = campos(base + chaveDv(base));
    expect(f[6].name).toBe("tpEmis 9 — contingência off-line (NFC-e)");
  });

  it("recusa DV errado, cUF fora do IBGE, mês 13, modelo e CNPJ inválidos", () => {
    expect(decode(`${NFE.slice(0, 43)}7`)).toEqual([]); // cDV trocado
    expect(decode(`44${NFE.slice(2)}`)).toEqual([]); // 44 não é código de UF
    expect(decode(`${NFE.slice(0, 20)}56${NFE.slice(22)}`)).toEqual([]); // modelo 56 não existe
    expect(decode(`${NFE.slice(0, 4)}13${NFE.slice(6)}`)).toEqual([]); // mês 13
    // CNPJ do emitente com DV quebrado, cDV da chave refeito para fechar:
    const falso = `${NFE.slice(0, 19)}9${NFE.slice(20, 43)}`;
    expect(NFE.slice(19, 20)).not.toBe("9"); // a troca precisa mudar algo
    expect(decode(falso + chaveDv(falso))).toEqual([]);
  });

  it("não dispara em ruído: boleto, CEP, CPF, telefone, coordenada, data, Base64, prosa", () => {
    // Código de barras de boleto (44 dígitos, mesmo tamanho): cUF 23 (CE) passa,
    // mas o mês "49" não existe — é o gate do AAMM que segura este caso.
    expect(decode("23794960100000237003381260007827135000006330")).toEqual([]);
    expect(decode("89010203")).toEqual([]); // CEP
    expect(decode("111.444.777-35")).toEqual([]); // CPF válido
    expect(decode("(47) 99123-4567")).toEqual([]); // telefone
    expect(decode("-26.9194, -49.0661")).toEqual([]); // coordenada
    expect(decode("14/08/2026")).toEqual([]); // data
    expect(decode("VGhlIExvZ2ljIExhYg==")).toEqual([]); // Base64
    expect(decode("a chave da nota fiscal está com a equipe azul")).toEqual([]);
    expect(decode(NFE.slice(0, 43))).toEqual([]); // 43 posições
    expect(decode(`${NFE}0`)).toEqual([]); // 45 posições
  });
});
