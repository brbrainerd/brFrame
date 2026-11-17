import { NextResponse } from "next/server";

import { cronState } from "../../../lib/cron-state";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ ok: true, lastCron: cronState.last });
}
