import { describe, expect, it } from "vitest";
import { barcodeType, gs1CheckDigit, isValidBarcode, toEan13 } from "./barcode";

describe("código de barras (GS1)", () => {
  it("valida o dígito verificador EAN-13", () => {
    expect(isValidBarcode("7891000053508")).toBe(true); // Leite Moça
    expect(isValidBarcode("7891000053509")).toBe(false); // DV errado
    expect(gs1CheckDigit("789100005350")).toBe(8);
  });

  it("valida UPC-A e EAN-8", () => {
    expect(barcodeType("036000291452")).toBe("UPC-A");
    expect(isValidBarcode("96385074")).toBe(true); // EAN-8 clássico
    expect(barcodeType("96385074")).toBe("EAN-8");
  });

  it("rejeita tamanho inválido", () => {
    expect(barcodeType("123")).toBeNull();
    expect(barcodeType("12345678901")).toBeNull(); // 11 dígitos
  });

  it("UPC-A normaliza para EAN-13 com zero à esquerda", () => {
    expect(toEan13("036000291452")).toBe("0036000291452");
  });
});
