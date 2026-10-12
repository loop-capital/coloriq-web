import type { Metadata } from "next";
import { DeveloperMixCalculator } from "@/components/tools/DeveloperMixCalculator";

export const metadata: Metadata = {
  title: "Developer Mix Calculator | ColorIq",
  description: "Calculate the exact developer volume, mix ratio, and processing time for professional hair color services. Free salon tool by ColorIq.",
  openGraph: {
    title: "Developer Mix Calculator | ColorIq",
    description: "Instant developer-to-color ratio for any hair color service.",
  },
};

export default function DeveloperMixPage() {
  return (
    <div
      className="min-h-screen p-4 pt-20 md:p-8 md:pt-8"
      style={{ background: "var(--cg-bg-deep)", color: "var(--cg-text-primary)" }}
    >
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold md:text-3xl" style={{ color: "var(--cg-text-primary)" }}>
            Developer Mix Calculator
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--cg-text-secondary)" }}>
            Enter the client’s starting level, target level, gray percentage, and coverage goal to get a precise formulation recommendation.
          </p>
        </div>
        <DeveloperMixCalculator />
      </div>
    </div>
  );
}
