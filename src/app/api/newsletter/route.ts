import { NextResponse } from "next/server";

/** Newsletter capture stays disabled until a real delivery + unsubscribe workflow is connected. */
export async function POST() {
  return NextResponse.json(
    { error: "Email updates are not available yet. No marketing email list is being collected." },
    { status: 503 }
  );
}
