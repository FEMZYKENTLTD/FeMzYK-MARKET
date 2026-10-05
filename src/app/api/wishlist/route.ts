import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser, ApiError } from "@/lib/auth";
import { insert, q1, run } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const user = getSessionUser();
    if (!user) throw new ApiError(401, "Please sign in to use your wishlist.");
    const body = await req.json();
    const { productId } = z.object({ productId: z.number().int().positive() }).parse(body);
    const existing = q1("SELECT id FROM wishlist_items WHERE user_id = ? AND product_id = ?", user.id, productId);
    if (existing) {
      run("DELETE FROM wishlist_items WHERE id = ?", existing.id);
      return NextResponse.json({ ok: true, added: false });
    }
    insert("INSERT INTO wishlist_items (user_id, product_id) VALUES (?, ?)", user.id, productId);
    return NextResponse.json({ ok: true, added: true });
  } catch (e: any) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Could not update your wishlist." }, { status: 500 });
  }
}
