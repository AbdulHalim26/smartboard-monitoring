import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(req: Request) {
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "Supabase belum dikonfigurasi" },
      { status: 500 },
    );
  }

  const url = new URL(req.url);
  const limitRaw = Number(url.searchParams.get("limit") ?? "50");
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(Math.floor(limitRaw), 1), 200)
    : 50;

  const { data, error } = await supabase
    .from("alerts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json(
    { ok: true, data },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
