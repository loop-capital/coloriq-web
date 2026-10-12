import type { Metadata } from "next";
import { BleachPredictor } from "@/components/tools/BleachPredictor";

export const metadata: Metadata = {
  title: "Bleach Level Predictor | ColorIq",
  description: "Predict bleach lift level, risk, and recommended technique based on starting level, developer volume, processing time, and hair condition. Free salon tool by ColorIq.",
  openGraph: {
    title: "Bleach Level Predictor | ColorIq",
    description: "Know your lift and risk before you bleach.",
  },
};

export default function BleachPredictorPage() {
  return (
    <div
      className="min-h-screen p-4 pt-20 md:p-8 md:pt-8"
      style={{ background: "var(--cg-bg-deep)", color: "var(--cg-text-primary)" }}
    >
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold md:text-3xl" style={{ color: "var(--cg-text-primary)" }}>
            Bleach Level Predictor
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--cg-text-secondary)" }}>
            Enter starting level, developer, processing time, and hair condition to predict lift and assess risk.
          </p>
        </div>
        <BleachPredictor />
      </div>
    </div>
  );
}
