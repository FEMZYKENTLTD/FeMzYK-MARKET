import { Metadata } from "next";
import GatewayClient from "./GatewayClient";

export const metadata: Metadata = { title: "Secure payment" };

export default function GatewayPage({ searchParams }: { searchParams: { ref?: string; amt?: string; cur?: string } }) {
  return (
    <div className="min-h-[70vh] flex items-center justify-center container-page py-12">
      <GatewayClient reference={searchParams.ref || ""} amountCents={parseInt(searchParams.amt || "0", 10)} currency={searchParams.cur || "USD"} />
    </div>
  );
}
