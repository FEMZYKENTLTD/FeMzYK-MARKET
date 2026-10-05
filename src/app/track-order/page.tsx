import { Metadata } from "next";
import TrackOrderClient from "./TrackOrderClient";

export const metadata: Metadata = {
  title: "Track Your Order",
  description: "Track your FEMZYK MARKET order with your order number and email.",
};

export default function TrackOrderPage({ searchParams }: { searchParams: { order?: string } }) {
  return (
    <div className="container-page py-12 max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <p className="eyebrow">Post-purchase care</p>
        <h1 className="font-display text-3xl text-cream-50 mt-2">Track your order</h1>
        <p className="text-sm text-mist-400 mt-2">Enter your order number (from your confirmation email) and the email you used at checkout.</p>
      </div>
      <TrackOrderClient initialOrder={searchParams.order || ""} />
    </div>
  );
}
