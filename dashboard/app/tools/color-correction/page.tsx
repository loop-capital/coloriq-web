import type { Metadata } from "next";
import { ColorCorrectionCalculator } from "@/components/tools/ColorCorrectionCalculator";

export const metadata: Metadata = {
  title: "Color Correction Calculator | ColorIq",
  description: "Find the right corrector shade, technique, and developer to neutralize unwanted hair color tones. Free salon tool by ColorIq.",
  openGraph: {
    title: "Color Correction Calculator | ColorIq",
    description: "Cancel orange, brass, yellow, red, green, ash, or purple tones with confidence.",
  },
};

export default function ColorCorrectionPage() {
  return (
    <div
      className="min-h-screen p-4 pt-20 md:p-8 md:pt-8"
      style={{ background: "var(--cg-bg-deep)", color: "var(--cg-text-primary)" }}
    >
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold md:text-3xl" style={{ color: "var(--cg-text-primary)" }}>
            Color Correction Calculator
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--cg-text-secondary)" }}>
            Select the unwanted tone, current level, and target tone to get a neutralization plan.
          </p>
        </div>
        <ColorCorrectionCalculator />
      </div>
    </div>
  );
}
