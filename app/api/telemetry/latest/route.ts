import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET() {
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "Supabase belum dikonfigurasi" },
      { status: 500 },
    );
  }

  const { data, error } = await supabase
    .from("telemetry")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json(
    { ok: true, data },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
