import type { Metadata } from "next";
import { PorosityTest } from "@/components/tools/PorosityTest";

export const metadata: Metadata = {
  title: "Hair Porosity Test | ColorIq",
  description: "Take a 5-question hair porosity quiz to determine low, medium, or high porosity and get personalized product and care routine recommendations.",
  openGraph: {
    title: "Hair Porosity Test | ColorIq",
    description: "Discover your client’s hair porosity in 60 seconds.",
  },
};

export default function PorosityTestPage() {
  return (
    <div
      className="min-h-screen p-4 pt-20 md:p-8 md:pt-8"
      style={{ background: "var(--cg-bg-deep)", color: "var(--cg-text-primary)" }}
    >
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold md:text-3xl" style={{ color: "var(--cg-text-primary)" }}>
            Hair Porosity Test
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--cg-text-secondary)" }}>
            Answer 5 quick questions about water absorption, product behavior, drying time, shine, and color retention.
          </p>
        </div>
        <PorosityTest />
      </div>
    </div>
  );
}
