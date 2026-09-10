import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getThresholdSettings, saveThresholdSettings } from "@/lib/settings";
import { THRESHOLDS, type ThresholdSettings } from "@/lib/thresholds";

export const runtime = "nodejs";

export async function GET() {
  const settings = getThresholdSettings();
  const latest = db.prepare(
    "SELECT temperature, humidity, gas_value, created_at FROM telemetry ORDER BY id DESC LIMIT 1"
  ).get() as { temperature: number | null; humidity: number | null; gas_value: number | null; created_at: string } | null;

  return NextResponse.json({ ok: true, settings, current: latest }, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body bukan JSON" }, { status: 400 });
  }

  const num = (v: unknown, fallback: number, min: number, max: number) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : fallback;
  };

  const raw = body as Record<string, unknown>;
  const settings: ThresholdSettings = {
    gas: num(raw.gas, THRESHOLDS.GAS, 50, 4095),
    temp: num(raw.temp, THRESHOLDS.TEMP, 10, 60),
    hum: num(raw.hum, THRESHOLDS.HUM, 20, 100),
    autoControl: raw.autoControl !== false,
  };

  saveThresholdSettings(settings);

  return NextResponse.json({ ok: true, settings });
}