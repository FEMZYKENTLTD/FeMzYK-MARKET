import { Metadata } from "next";
import { notFound } from "next/navigation";
import GatewayClient from "./GatewayClient";
import { getPaymentProvider } from "@/lib/payments";

export const metadata: Metadata = { title: "FEMZYK test gateway", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function GatewayPage({ searchParams }: { searchParams: Promise<{ ref?: string; amt?: string; cur?: string }> }) {
  // The simulated gateway is available only when the active provider is mock in development.
  let isMock = false;
  try { isMock = process.env.NODE_ENV !== "production" && getPaymentProvider().code === "mock"; } catch {}
  if (!isMock) notFound();
  return (
    <div className="min-h-[70vh] flex items-center justify-center container-page py-12">
      <GatewayClient reference={(await searchParams).ref || ""} amountCents={parseInt((await searchParams).amt || "0", 10)} currency={(await searchParams).cur || "USD"} />
    </div>
  );
}
