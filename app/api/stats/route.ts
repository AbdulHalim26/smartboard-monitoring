import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const hoursRaw = Number(url.searchParams.get("hours") ?? "24");
  const hours = Number.isFinite(hoursRaw) ? Math.min(Math.max(Math.floor(hoursRaw), 1), 720) : 24;
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  const rows = db.prepare(
    "SELECT * FROM telemetry WHERE created_at >= ?"
  ).all(since) as { temperature: number | null; humidity: number | null; gas_value: number | null }[];

  const alertCount = db.prepare(
    "SELECT COUNT(*) as cnt FROM alerts WHERE created_at >= ?"
  ).get(since) as { cnt: number };

  const temps = rows.map((r) => r.temperature).filter((v): v is number => typeof v === "number");
  const hums = rows.map((r) => r.humidity).filter((v): v is number => typeof v === "number");
  const gases = rows.map((r) => r.gas_value).filter((v): v is number => typeof v === "number");
  const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

  const result = {
    avg_temp: Math.round(avg(temps) * 10) / 10,
    min_temp: temps.length ? Math.min(...temps) : 0,
    max_temp: temps.length ? Math.max(...temps) : 0,
    avg_hum: Math.round(avg(hums) * 10) / 10,
    min_hum: hums.length ? Math.min(...hums) : 0,
    max_hum: hums.length ? Math.max(...hums) : 0,
    avg_gas: Math.round(avg(gases)),
    max_gas: gases.length ? Math.max(...gases) : 0,
    alert_count: alertCount?.cnt ?? 0,
  };

  return NextResponse.json({ ok: true, ...result }, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
