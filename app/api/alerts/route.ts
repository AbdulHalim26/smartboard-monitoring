import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limitRaw = Number(url.searchParams.get("limit") ?? "50");
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.floor(limitRaw), 1), 200) : 50;

  const rows = db.prepare(
    "SELECT * FROM alerts ORDER BY created_at DESC LIMIT ?"
  ).all(limit);

  return NextResponse.json({ ok: true, data: rows }, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
