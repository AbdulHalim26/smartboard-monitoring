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
  const hoursRaw = Number(url.searchParams.get("hours") ?? "24");
  const hours = Number.isFinite(hoursRaw)
    ? Math.min(Math.max(Math.floor(hoursRaw), 1), 720)
    : 24;

  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  const [{ data: rows, error: rowsErr }, { count: alertCount, error: alertErr }] =
    await Promise.all([
      supabase
        .from("telemetry")
        .select("*")
        .gte("created_at", since),
      supabase
        .from("alerts")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since),
    ]);

  if (rowsErr || alertErr) {
    return NextResponse.json(
      { ok: false, error: rowsErr?.message ?? alertErr?.message },
      { status: 500 },
    );
  }

  const rowsArr = rows ?? [];
  const temps = rowsArr
    .map((r) => r.temperature)
    .filter((v): v is number => typeof v === "number");
  const hums = rowsArr
    .map((r) => r.humidity)
    .filter((v): v is number => typeof v === "number");
  const gases = rowsArr
    .map((r) => r.gas_value)
    .filter((v): v is number => typeof v === "number");

  const avg = (arr: number[]) =>
    arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  const result = {
    avg_temp: Math.round(avg(temps) * 10) / 10,
    min_temp: temps.length ? Math.min(...temps) : 0,
    max_temp: temps.length ? Math.max(...temps) : 0,
    avg_hum: Math.round(avg(hums) * 10) / 10,
    min_hum: hums.length ? Math.min(...hums) : 0,
    max_hum: hums.length ? Math.max(...hums) : 0,
    avg_gas: Math.round(avg(gases)),
    max_gas: gases.length ? Math.max(...gases) : 0,
    alert_count: alertCount ?? 0,
  };

  return NextResponse.json(
    { ok: true, ...result },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
