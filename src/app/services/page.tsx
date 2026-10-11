import type { Metadata } from "next";
import Link from "next/link";
import { listProducts } from "@/lib/repo/catalog";
import { formatMoney, convertCents } from "@/lib/money";
import { getDisplayCurrency } from "@/lib/moneyServer";
import EmptyState from "@/components/ui/EmptyState";

export const metadata: Metadata = {
  title: "Services",
  description: "View the service listings currently published by FEMZYK MARKET.",
};

export default async function ServicesPage() {
  const services = listProducts({ type: "SERVICE", perPage: 24 }).items;
  const currency = await getDisplayCurrency();

  return (
    <div>
      <section className="relative overflow-hidden border-b border-ink-700">
        <div className="absolute inset-0 bg-gradient-to-br from-navy-950 via-ink-950 to-ink-900" aria-hidden />
        <div className="container-page relative py-16 sm:py-20 text-center max-w-3xl mx-auto">
          <p className="eyebrow">SERVICES</p>
          <h1 className="font-display text-4xl sm:text-5xl text-cream-50 mt-3 leading-tight">Services</h1>
          <p className="mt-5 text-mist-300 leading-relaxed">
            Review the scope, pricing, exclusions, and timing shown on each published listing before ordering.
          </p>
        </div>
      </section>

      <section className="container-page py-12">
        {services.length === 0 ? (
          <EmptyState
            icon="🛠️"
            title="No services are currently published."
            body="Published service listings will appear here. For questions, submit a support request."
            ctaHref="/help"
            ctaLabel="Visit the Help Center"
          />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {services.map((service: any) => (
              <Link key={service.id} href={`/services/${service.slug}`} className="card card-hover p-6 flex flex-col">
                <h2 className="font-display text-xl text-cream-50">{service.name}</h2>
                <p className="text-[13px] text-mist-400 mt-2 leading-relaxed">{service.short_description}</p>
                <div className="mt-5 pt-4 border-t border-ink-700">
                  <span className="text-sm text-mist-400">
                    {service.service_quote_type === "fixed" ? "Listed price: " : service.service_quote_type === "starting" && service.service_package_count > 0 ? "Starting from: " : "Pricing: "}
                  </span>
                  {service.service_quote_type === "fixed" || (service.service_quote_type === "starting" && service.service_package_count > 0) ? (
                    <span className="text-lg font-semibold text-gold-300">{formatMoney(convertCents(service.price_cents, currency), currency)}</span>
                  ) : (
                    <span className="text-sm text-mist-300">Review package options</span>
                  )}
                </div>
                <span className="text-xs text-gold-400 mt-4">Review listing details →</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
