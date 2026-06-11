import { NextRequest, NextResponse } from "next/server";
import { routeAndGenerate } from "@/lib/bedrock";
import { runSuiteQL } from "@/lib/netsuite";
import { validateReadOnly } from "@/lib/guardrail";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { question, history } = await req.json().catch(() => ({ question: "", history: [] }));
  if (!question?.trim()) return NextResponse.json({ error: "Missing question." }, { status: 400 });

  // 1) Route + generate (Bedrock with conversation history, or demo mock)
  const plan = await routeAndGenerate(question, history || []);

  // 2) Non-data modes return immediately
  if (plan.mode !== "data" || !plan.query?.trim()) return NextResponse.json(plan);

  // 3) Guardrail — server-side, before anything runs
  const v = validateReadOnly(plan.query);
  if (!v.ok) return NextResponse.json({ ...plan, blocked: true, guardrail: v.reason });

  // 4) Run (SuiteQL REST, or demo mock)
  const { columns, rows } = await runSuiteQL(plan.query);
  return NextResponse.json({ ...plan, guardrail: v.reason, columns, rows });
}
