/** Shared cart line type (client-safe — no DB imports). */
export interface CartLine {
  id: number;
  product_id: number;
  variant_id: number | null;
  package_id?: number | null;
  package_name?: string | null;
  qty: number;
  saved_for_later: number;
  slug: string;
  name: string;
  type_code: string;
  image: string | null;
  image_alt: string | null;
  unit_price_cents: number;
  compare_at_cents: number | null;
  stock_qty: number;
  track_inventory: number;
  allow_backorder: number;
  requires_shipping: number;
  variant_name: string | null;
  unavailable: boolean;
  in_stock: boolean;
}
