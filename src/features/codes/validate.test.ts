import { describe, expect, it } from "vitest";
import { formatIsbn, formatNcm, isbnType, looksLikeNcm } from "./validate";

describe("ISBN", () => {
  it("validates ISBN-13 and ISBN-10", () => {
    expect(isbnType("9788535914849")).toBe("ISBN-13"); // 1984 (Companhia das Letras)
    expect(isbnType("978-85-359-1484-9")).toBe("ISBN-13");
    expect(isbnType("0306406152")).toBe("ISBN-10");
    expect(isbnType("020161622X")).toBe("ISBN-10"); // check digit X
  });
  it("rejects bad check digits", () => {
    expect(isbnType("9788535914840")).toBeNull();
    expect(isbnType("0306406153")).toBeNull();
    expect(isbnType("123")).toBeNull();
  });
  it("formats", () => {
    expect(formatIsbn("9788535914849")).toBe("978-8-53591-484-9");
  });
});

describe("NCM", () => {
  it("recognises an 8-digit code", () => {
    expect(looksLikeNcm("33030010")).toBe(true);
    expect(looksLikeNcm("3303.00.10")).toBe(true);
    expect(looksLikeNcm("123")).toBe(false);
  });
  it("formats", () => {
    expect(formatNcm("33030010")).toBe("3303.00.10");
  });
});
