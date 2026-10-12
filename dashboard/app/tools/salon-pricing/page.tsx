import type { Metadata } from "next";
import { SalonPricingCalculator } from "@/components/tools/SalonPricingCalculator";

export const metadata: Metadata = {
  title: "Salon Pricing Calculator | ColorIq",
  description: "Calculate service pricing, profit margins, and cost breakdowns for professional hair color and salon services. Free tool by ColorIq.",
  openGraph: {
    title: "Salon Pricing Calculator | ColorIq",
    description: "Price your salon services with confidence.",
  },
};

export default function SalonPricingPage() {
  return (
    <div
      className="min-h-screen p-4 pt-20 md:p-8 md:pt-8"
      style={{ background: "var(--cg-bg-deep)", color: "var(--cg-text-primary)" }}
    >
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold md:text-3xl" style={{ color: "var(--cg-text-primary)" }}>
            Salon Pricing Calculator
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--cg-text-secondary)" }}>
            Enter product cost, chair time, stylist rate, overhead, and desired margin to find the right service price.
          </p>
        </div>
        <SalonPricingCalculator />
      </div>
    </div>
  );
}
