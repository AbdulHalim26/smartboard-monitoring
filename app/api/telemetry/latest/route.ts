import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const row = db.prepare(
    "SELECT * FROM telemetry ORDER BY created_at DESC LIMIT 1"
  ).get();

  return NextResponse.json({ ok: true, data: row ?? null }, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
