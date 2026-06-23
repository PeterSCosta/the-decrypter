/** Busca de produto (Open Food Facts) via backend the-decrypter-api. Só alimentos. */
import { api } from "./api";

export interface ProductInfo {
  name: string | null;
  brands: string | null;
  quantity: string | null;
}

export async function fetchProduct(barcode: string): Promise<ProductInfo> {
  const code = barcode.replace(/\D/g, "");
  const res = await fetch(api(`/produto/${code}`));
  if (res.status === 404) {
    throw new Error("Produto não encontrado (Open Food Facts cobre só alimentos).");
  }
  if (!res.ok) throw new Error(`Falha na consulta (HTTP ${res.status}).`);
  const p = (await res.json()) as { name?: string; brands?: string; quantity?: string };
  return {
    name: p.name || null,
    brands: p.brands || null,
    quantity: p.quantity || null,
  };
}
