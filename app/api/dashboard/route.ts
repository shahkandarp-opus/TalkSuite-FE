import { NextResponse } from "next/server";
import { mockDashboard } from "@/lib/mock";

export const runtime = "nodejs";

// DEMO MODE returns mock metrics. To go live, run a few fixed SuiteQL queries here
// (revenue YTD, open invoice count, overdue count, monthly series, top customers)
// via runSuiteQL from @/lib/netsuite and shape them into the same response.
export async function GET() {
  return NextResponse.json(mockDashboard());
}
