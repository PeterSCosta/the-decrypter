/** Cliente da Open Food Facts (grátis, sem chave, CORS liberado). Só alimentos. */

export interface ProductInfo {
  name: string | null;
  brands: string | null;
  quantity: string | null;
}

export async function fetchProduct(barcode: string): Promise<ProductInfo> {
  const code = barcode.replace(/\D/g, "");
  const res = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=product_name,brands,quantity`,
  );
  if (!res.ok) throw new Error(`Falha na consulta (HTTP ${res.status}).`);
  const d = (await res.json()) as {
    status?: number;
    product?: { product_name?: string; brands?: string; quantity?: string };
  };
  if (d.status !== 1 || !d.product) {
    throw new Error("Produto não encontrado (Open Food Facts cobre só alimentos).");
  }
  const p = d.product;
  return {
    name: p.product_name || null,
    brands: p.brands || null,
    quantity: p.quantity || null,
  };
}
