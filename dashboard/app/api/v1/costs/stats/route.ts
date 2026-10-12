import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { getSalonIdForUser } from "@/lib/stylist";
import { z } from "zod";

const querySchema = z.object({
  period: z.enum(["week", "month", "quarter"]).default("month"),
});

/** Vish's published benchmark: average product cost per service. */
const BENCHMARK_COST_PER_SERVICE = 8.0;

interface StepData {
  brand?: string;
  shadeCode?: string;
  targetGrams?: number;
  actualGrams?: number;
  role?: string;
  product?: string;
}

function periodStart(period: "week" | "month" | "quarter"): Date {
  const d = new Date();
  if (period === "week") d.setDate(d.getDate() - 7);
  else if (period === "month") d.setMonth(d.getMonth() - 1);
  else d.setMonth(d.getMonth() - 3);
  return d;
}

/** Derive a service category from the steps, for breakdown reporting. */
function serviceCategory(steps: StepData[]): string {
  const roles = steps.map((s) => (s.role || "").toLowerCase());
  const products = steps.map((s) => (s.product || "").toLowerCase()).join(" ");
  if (roles.some((r) => r.includes("toner") || r.includes("gloss"))) return "Toner / Gloss";
  if (roles.some((r) => r.includes("lighten") || r.includes("bleach")) || products.includes("blond")) return "Lightening";
  if (roles.some((r) => r.includes("developer")) && steps.length <= 3) return "Root Touch-Up";
  if (steps.length >= 5) return "Full Color";
  return "Color Service";
}

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    const salon_id = await getSalonIdForUser(user.userId);
    if (!salon_id) {
      return NextResponse.json({ error: "No salon found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const parsed = querySchema.safeParse(Object.fromEntries(searchParams.entries()));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid query" }, { status: 400 });
    }
    const { period } = parsed.data;
    const start = periodStart(period);
    const trendStart = new Date();
    trendStart.setDate(trendStart.getDate() - 84); // 12 weeks

    const sessions = await prisma.color_bar_sessions.findMany({
      where: {
        salon_id,
        status: "completed",
        completed_at: { gte: trendStart },
      },
      select: {
        id: true,
        stylist_id: true,
        completed_at: true,
        steps: true,
      },
      orderBy: { completed_at: "desc" },
    });

    // Batch cost lookup
    const items = await prisma.inventory_items.findMany({
      where: { salon_id, is_active: true },
      select: { brand: true, shade_code: true, cost_per_unit: true },
    });
    const costMap = new Map<string, number>();
    for (const item of items) {
      if (item.cost_per_unit != null) {
        costMap.set(`${item.brand}|${item.shade_code}`, Number(item.cost_per_unit));
      }
    }

    // Stylist names
    const stylistIds = [...new Set(sessions.map((s) => s.stylist_id))];
    const users = await prisma.users.findMany({
      where: { id: { in: stylistIds } },
      select: { id: true, first_name: true, last_name: true },
    });
    const nameMap = new Map<string, string>();
    for (const u of users) {
      nameMap.set(u.id, [u.first_name, u.last_name].filter(Boolean).join(" ") || "Unknown");
    }

    interface ServiceCost {
      sessionId: string;
      stylistId: string;
      completedAt: Date;
      wholesaleCost: number;
      category: string;
    }

    const services: ServiceCost[] = [];
    for (const session of sessions) {
      const steps = (session.steps as unknown as StepData[]) || [];
      if (!Array.isArray(steps) || steps.length === 0) continue;
      let wholesale = 0;
      for (const step of steps) {
        const grams = Math.max(step.actualGrams || step.targetGrams || 0, 0);
        const costPerGram = costMap.get(`${step.brand || "?"}|${step.shadeCode || "?"}`) || 0;
        wholesale += grams * costPerGram;
      }
      services.push({
        sessionId: session.id,
        stylistId: session.stylist_id,
        completedAt: session.completed_at || new Date(),
        wholesaleCost: wholesale,
        category: serviceCategory(steps),
      });
    }

    const inPeriod = services.filter((s) => s.completedAt >= start);
    const count = inPeriod.length;
    const totalCost = inPeriod.reduce((s, x) => s + x.wholesaleCost, 0);
    const avgCost = count > 0 ? totalCost / count : 0;

    // Trend: avg cost per service by week, last 12 weeks
    const weekBuckets = new Map<string, { cost: number; count: number }>();
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i * 7);
      weekBuckets.set(d.toISOString().slice(0, 10), { cost: 0, count: 0 });
    }
    for (const s of services) {
      let best: string | null = null;
      for (const k of weekBuckets.keys()) {
        if (k <= s.completedAt.toISOString().slice(0, 10)) best = k;
      }
      if (best) {
        const b = weekBuckets.get(best)!;
        b.cost += s.wholesaleCost;
        b.count += 1;
      }
    }
    const trend = [...weekBuckets.entries()].map(([week, b]) => ({
      week,
      avgCost: b.count > 0 ? Math.round((b.cost / b.count) * 100) / 100 : 0,
      services: b.count,
    }));

    // Per-stylist
    const byStylist = new Map<string, { cost: number; count: number }>();
    for (const s of inPeriod) {
      const agg = byStylist.get(s.stylistId) || { cost: 0, count: 0 };
      agg.cost += s.wholesaleCost;
      agg.count += 1;
      byStylist.set(s.stylistId, agg);
    }
    const stylists = [...byStylist.entries()]
      .map(([id, a]) => ({
        stylistId: id,
        name: nameMap.get(id) || "Unknown",
        avgCost: a.count > 0 ? Math.round((a.cost / a.count) * 100) / 100 : 0,
        totalCost: Math.round(a.cost * 100) / 100,
        services: a.count,
      }))
      .sort((a, b) => b.avgCost - a.avgCost);

    // By service category
    const byCategory = new Map<string, { cost: number; count: number }>();
    for (const s of inPeriod) {
      const agg = byCategory.get(s.category) || { cost: 0, count: 0 };
      agg.cost += s.wholesaleCost;
      agg.count += 1;
      byCategory.set(s.category, agg);
    }
    const categories = [...byCategory.entries()]
      .map(([category, a]) => ({
        category,
        avgCost: a.count > 0 ? Math.round((a.cost / a.count) * 100) / 100 : 0,
        services: a.count,
      }))
      .sort((a, b) => b.services - a.services);

    return NextResponse.json({
      period,
      summary: {
        avgCostPerService: Math.round(avgCost * 100) / 100,
        totalProductCost: Math.round(totalCost * 100) / 100,
        services: count,
        benchmark: BENCHMARK_COST_PER_SERVICE,
      },
      trend,
      stylists,
      categories,
    });
  } catch (error) {
    console.error("Cost stats error:", error);
    return NextResponse.json({ error: "Failed to load cost stats" }, { status: 500 });
  }
}
