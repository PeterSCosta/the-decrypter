/** Busca de produto (Open Food Facts) via backend the-decrypter-api. Só alimentos. */
import { ApiError, apiFetch } from "./api";

export interface ProductInfo {
  name: string | null;
  brands: string | null;
  quantity: string | null;
}

export async function fetchProduct(barcode: string): Promise<ProductInfo> {
  const code = barcode.replace(/\D/g, "");
  const p = await apiFetch<{ name?: string; brands?: string; quantity?: string }>(
    `/produto/${code}`,
  ).catch((e) => {
    if (e instanceof ApiError && e.status === 404) {
      throw new Error("Produto não encontrado (Open Food Facts cobre só alimentos).");
    }
    throw e;
  });
  return {
    name: p.name || null,
    brands: p.brands || null,
    quantity: p.quantity || null,
  };
}
