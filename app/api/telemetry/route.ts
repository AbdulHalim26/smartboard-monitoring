import { NextResponse } from "next/server";
import { telemetrySchema } from "@/lib/validate";
import { computeStatus } from "@/lib/thresholds";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";

const ALERT_MESSAGES: Record<string, string> = {
  GAS: "Kualitas udara buruk (gas tinggi)!",
  TEMP: "Suhu terlalu tinggi!",
  HUM: "Kelembapan terlalu tinggi!",
};

async function checkApiKey(req: Request): Promise<boolean> {
  const key = req.headers.get("x-api-key");
  return Boolean(key && key === process.env.IOT_API_KEY);
}

export async function POST(req: Request) {
  if (!(await checkApiKey(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "Supabase belum dikonfigurasi" },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body bukan JSON" }, { status: 400 });
  }

  const parsed = telemetrySchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }

  const { status, reasons } = computeStatus({
    gas_value: parsed.data.gas_value,
    temperature: parsed.data.temperature,
    humidity: parsed.data.humidity,
  });

  const row = {
    device_id: parsed.data.device_id,
    temperature: parsed.data.temperature,
    humidity: parsed.data.humidity,
    gas_value: parsed.data.gas_value,
    status,
    fan_on: parsed.data.fan_on,
    buzzer_on: parsed.data.buzzer_on,
    led_red_on: parsed.data.led_red_on,
    led_green_on: parsed.data.led_green_on,
  };

  const { data: inserted, error: insertErr } = await supabase
    .from("telemetry")
    .insert(row)
    .select()
    .single();

  if (insertErr || !inserted) {
    return NextResponse.json(
      { ok: false, error: insertErr?.message ?? "Gagal insert telemetry" },
      { status: 500 },
    );
  }

  if (status === "ALERT") {
    const alerts = reasons.map((r) => ({
      telemetry_id: inserted.id,
      device_id: inserted.device_id,
      alert_type: r,
      message: ALERT_MESSAGES[r],
      value: r === "GAS" ? inserted.gas_value : r === "TEMP" ? inserted.temperature : inserted.humidity,
      threshold:
        r === "GAS"
          ? 3500
          : r === "TEMP"
            ? 40.0
            : 75.0,
    }));
    await supabase.from("alerts").insert(alerts);
  }

  return NextResponse.json(
    { ok: true, id: inserted.id, status: inserted.status },
    { status: 201 },
  );
}

export async function GET(req: Request) {
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "Supabase belum dikonfigurasi" },
      { status: 500 },
    );
  }

  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const limitRaw = Number(url.searchParams.get("limit") ?? "100");
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(Math.floor(limitRaw), 1), 500)
    : 100;

  let q = supabase
    .from("telemetry")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (from) q = q.gte("created_at", from);
  if (to) q = q.lte("created_at", to);

  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json(
    { ok: true, data },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
