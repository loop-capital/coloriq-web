import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { getSalonIdForUser } from "@/lib/stylist";
import { z } from "zod";

const triageSchema = z.object({
  clientName: z.string().optional(),
  clientId: z.string().uuid().optional(),
  input: z.object({
    symptoms: z.array(z.string()),
    productType: z.string().optional(),
    developerVolume: z.string().optional(),
    processingMinutes: z.number().optional(),
    heatUsed: z.boolean().optional(),
    hairCondition: z.string(),
    previousBleach: z.boolean().optional(),
    scalpSymptoms: z.array(z.string()),
    hairIntegrity: z.array(z.string()),
    systemicSymptoms: z.array(z.string()),
  }),
  riskGrade: z.enum(["LOW", "MEDIUM", "HIGH", "EMERGENCY"]),
  triggers: z.array(z.string()),
  plan: z.object({
    steps: z.array(z.object({
      stepNumber: z.number(),
      title: z.string(),
      detail: z.string(),
      timing: z.string().optional(),
      warning: z.string().optional(),
    })),
    issues: z.array(z.object({
      id: z.string(),
      name: z.string(),
      severity: z.string(),
    })),
    homeCare: z.array(z.string()),
  }),
});

// POST /api/v1/triage — log a triage session to the permanent record.
// Every triage is stored with timestamp, risk grade, inputs, and plan
// for liability documentation.
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    const salon_id = await getSalonIdForUser(user.userId);

    const body = triageSchema.parse(await req.json());

    const session = await prisma.triage_sessions.create({
      data: {
        salon_id,
        stylist_id: user.userId,
        client_id: body.clientId || null,
        client_name: body.clientName || null,
        risk_grade: body.riskGrade,
        symptoms: body.input.symptoms,
        triage_input: body.input as object,
        risk_triggers: body.triggers,
        recovery_plan: body.plan as object,
      },
    });

    return NextResponse.json({ id: session.id, riskGrade: session.risk_grade }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid triage data", details: err.issues }, { status: 400 });
    }
    console.error("[triage] Failed to log session:", err);
    return NextResponse.json({ error: "Failed to log triage session" }, { status: 500 });
  }
}

// GET /api/v1/triage — list recent triage sessions for the salon
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    const salon_id = await getSalonIdForUser(user.userId);

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);
    const grade = searchParams.get("grade"); // optional filter

    const sessions = await prisma.triage_sessions.findMany({
      where: {
        salon_id,
        ...(grade ? { risk_grade: grade } : {}),
      },
      orderBy: { created_at: "desc" },
      take: limit,
      select: {
        id: true,
        client_name: true,
        risk_grade: true,
        symptoms: true,
        created_at: true,
      },
    });

    return NextResponse.json({ sessions });
  } catch (err) {
    console.error("[triage] Failed to list sessions:", err);
    return NextResponse.json({ error: "Failed to list triage sessions" }, { status: 500 });
  }
}
