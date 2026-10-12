import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { getSalonIdForUser } from "@/lib/stylist";
import { z } from "zod";

const querySchema = z.object({
  period: z.enum(["week", "month", "quarter"]).default("month"),
});

interface StepData {
  brand?: string;
  shadeCode?: string;
  targetGrams?: number;
  actualGrams?: number;
  role?: string;
  product?: string;
}

function periodStart(period: "week" | "month" | "quarter"): Date {
  const now = new Date();
  const d = new Date(now);
  if (period === "week") d.setDate(d.getDate() - 7);
  else if (period === "month") d.setMonth(d.getMonth() - 1);
  else d.setMonth(d.getMonth() - 3);
  return d;
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

    // Completed sessions in period + last 12 weeks for trend
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

    // Batch cost lookup: all active inventory items for this salon
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
      const name = [u.first_name, u.last_name].filter(Boolean).join(" ") || "Unknown";
      nameMap.set(u.id, name);
    }

    interface WasteEntry {
      sessionId: string;
      stylistId: string;
      completedAt: Date;
      wasteGrams: number;
      wasteCost: number;
      mixedGrams: number;
      productKey: string;
      brand: string;
      shadeCode: string;
    }

    const entries: WasteEntry[] = [];
    for (const session of sessions) {
      const steps = (session.steps as unknown as StepData[]) || [];
      if (!Array.isArray(steps)) continue;
      for (const step of steps) {
        const target = step.targetGrams || 0;
        const actual = step.actualGrams || target || 0;
        const waste = Math.max(target - actual, 0);
        const mixed = Math.max(target, actual, 0);
        if (waste < 0.5 && mixed <= 0) continue;
        const key = `${step.brand || "?" }|${step.shadeCode || "?"}`;
        const costPerGram = costMap.get(key) || 0;
        entries.push({
          sessionId: session.id,
          stylistId: session.stylist_id,
          completedAt: session.completed_at || new Date(),
          wasteGrams: waste,
          wasteCost: waste * costPerGram,
          mixedGrams: mixed,
          productKey: key,
          brand: step.brand || "Unknown",
          shadeCode: step.shadeCode || "—",
        });
      }
    }

    const inPeriod = entries.filter((e) => e.completedAt >= start);

    const totalWasteGrams = inPeriod.reduce((s, e) => s + e.wasteGrams, 0);
    const totalWasteCost = inPeriod.reduce((s, e) => s + e.wasteCost, 0);
    const totalMixedGrams = inPeriod.reduce((s, e) => s + e.mixedGrams, 0);
    const wastePct = totalMixedGrams > 0 ? (totalWasteGrams / totalMixedGrams) * 100 : 0;
    const sessionCount = new Set(inPeriod.map((e) => e.sessionId)).size;

    // Trend: waste % by week, last 12 weeks
    const weekBuckets = new Map<string, { waste: number; mixed: number }>();
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i * 7);
      const key = d.toISOString().slice(0, 10);
      weekBuckets.set(key, { waste: 0, mixed: 0 });
    }
    for (const e of entries) {
      // find nearest bucket at or before entry date
      let best: string | null = null;
      for (const k of weekBuckets.keys()) {
        if (k <= e.completedAt.toISOString().slice(0, 10)) best = k;
      }
      if (best) {
        const b = weekBuckets.get(best)!;
        b.waste += e.wasteGrams;
        b.mixed += e.mixedGrams;
      }
    }
    const trend = [...weekBuckets.entries()].map(([week, b]) => ({
      week,
      wastePct: b.mixed > 0 ? Math.round((b.waste / b.mixed) * 1000) / 10 : 0,
      wasteGrams: Math.round(b.waste * 10) / 10,
    }));

    // Per-stylist breakdown
    const byStylist = new Map<string, { waste: number; cost: number; sessions: Set<string> }>();
    for (const e of inPeriod) {
      const agg = byStylist.get(e.stylistId) || { waste: 0, cost: 0, sessions: new Set<string>() };
      agg.waste += e.wasteGrams;
      agg.cost += e.wasteCost;
      agg.sessions.add(e.sessionId);
      byStylist.set(e.stylistId, agg);
    }
    const stylists = [...byStylist.entries()]
      .map(([id, a]) => ({
        stylistId: id,
        name: nameMap.get(id) || "Unknown",
        wasteGrams: Math.round(a.waste * 10) / 10,
        wasteCost: Math.round(a.cost * 100) / 100,
        sessions: a.sessions.size,
        avgWastePerSession: a.sessions.size > 0 ? Math.round((a.waste / a.sessions.size) * 10) / 10 : 0,
      }))
      .sort((a, b) => b.wasteGrams - a.wasteGrams);

    // Top wasted products
    const byProduct = new Map<string, { waste: number; cost: number; brand: string; shadeCode: string }>();
    for (const e of inPeriod) {
      const agg = byProduct.get(e.productKey) || { waste: 0, cost: 0, brand: e.brand, shadeCode: e.shadeCode };
      agg.waste += e.wasteGrams;
      agg.cost += e.wasteCost;
      byProduct.set(e.productKey, agg);
    }
    const topProducts = [...byProduct.values()]
      .map((p) => ({
        brand: p.brand,
        shadeCode: p.shadeCode,
        wasteGrams: Math.round(p.waste * 10) / 10,
        wasteCost: Math.round(p.cost * 100) / 100,
      }))
      .sort((a, b) => b.wasteGrams - a.wasteGrams)
      .slice(0, 10);

    return NextResponse.json({
      period,
      summary: {
        totalWasteGrams: Math.round(totalWasteGrams * 10) / 10,
        totalWasteCost: Math.round(totalWasteCost * 100) / 100,
        wastePct: Math.round(wastePct * 10) / 10,
        benchmarkPct: 10,
        sessions: sessionCount,
      },
      trend,
      stylists,
      topProducts,
    });
  } catch (error) {
    console.error("Waste stats error:", error);
    return NextResponse.json({ error: "Failed to load waste stats" }, { status: 500 });
  }
}
