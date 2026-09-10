import { NextResponse } from "next/server";
import { telemetrySchema } from "@/lib/validate";
import { computeStatus, type ThresholdSettings } from "@/lib/thresholds";
import { getThresholdSettings } from "@/lib/settings";
import { db } from "@/lib/db";

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

// Antrikan perintah otomatis ke ESP32 agar aktuator mengikuti status.
// Hanya kirim ketika state BERUBAH (beda dari yang dilaporkan ESP32),
// dan hindari duplikat kalau masih ada command pending sejenis.
function queueAutoControl(
  deviceId: string,
  current: { fan_on: boolean; buzzer_on: boolean; led_red_on: boolean; led_green_on: boolean },
  status: "NORMAL" | "ALERT"
) {
  const pairs: [string, boolean][] = [];
  if (status === "ALERT") {
    if (!current.fan_on) pairs.push(["fan_on", true]);
    if (!current.buzzer_on) pairs.push(["buzzer_on", true]);
    if (!current.led_red_on) pairs.push(["led_red_on", true]);
    if (current.led_green_on) pairs.push(["led_green_off", false]);
  } else {
    if (current.fan_on) pairs.push(["fan_off", false]);
    if (current.buzzer_on) pairs.push(["buzzer_off", false]);
    if (current.led_red_on) pairs.push(["led_red_off", false]);
    if (!current.led_green_on) pairs.push(["led_green_on", true]);
  }

  if (pairs.length === 0) return;

  const existsPending = db.prepare(
    "SELECT id FROM device_commands WHERE device_id = ? AND command = ? AND executed = 0 LIMIT 1"
  );
  const insert = db.prepare(
    "INSERT INTO device_commands (device_id, command, payload) VALUES (?, ?, ?)"
  );
  const t = db.transaction(() => {
    for (const [cmd, on] of pairs) {
      if (!existsPending.get(deviceId, cmd)) {
        insert.run(deviceId, cmd, on ? "1" : "0");
      }
    }
  });
  t();
}

export async function POST(req: Request) {
  if (!(await checkApiKey(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body bukan JSON" }, { status: 400 });
  }

  const parsed = telemetrySchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }

  const settings: ThresholdSettings = getThresholdSettings();
  const { status, reasons } = computeStatus(
    {
      gas_value: parsed.data.gas_value,
      temperature: parsed.data.temperature,
      humidity: parsed.data.humidity,
    },
    settings
  );

  const insertStmt = db.prepare(`
    INSERT INTO telemetry (device_id, temperature, humidity, gas_value, status, fan_on, buzzer_on, led_red_on, led_green_on)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = insertStmt.run(
    parsed.data.device_id,
    parsed.data.temperature,
    parsed.data.humidity,
    parsed.data.gas_value,
    status,
    parsed.data.fan_on ? 1 : 0,
    parsed.data.buzzer_on ? 1 : 0,
    parsed.data.led_red_on ? 1 : 0,
    parsed.data.led_green_on ? 1 : 0,
  );

  const insertedId = result.lastInsertRowid;

  if (status === "ALERT") {
    const insertAlert = db.prepare(`
      INSERT INTO alerts (telemetry_id, device_id, alert_type, message, value, threshold)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const insertMany = db.transaction((reasonsList: string[]) => {
      for (const r of reasonsList) {
        insertAlert.run(
          insertedId,
          parsed.data.device_id,
          r,
          ALERT_MESSAGES[r],
          r === "GAS"
            ? parsed.data.gas_value
            : r === "TEMP"
              ? parsed.data.temperature
              : parsed.data.humidity,
          r === "GAS" ? settings.gas : r === "TEMP" ? settings.temp : settings.hum,
        );
      }
    });
    insertMany(reasons);
  }

  if (settings.autoControl) {
    queueAutoControl(parsed.data.device_id, parsed.data, status);
  }

  return NextResponse.json({ ok: true, id: insertedId, status }, { status: 201 });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const limitRaw = Number(url.searchParams.get("limit") ?? "100");
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.floor(limitRaw), 1), 500) : 100;

  let query = "SELECT * FROM telemetry";
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (from) {
    conditions.push("created_at >= ?");
    params.push(from);
  }
  if (to) {
    conditions.push("created_at <= ?");
    params.push(to);
  }

  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }
  query += " ORDER BY created_at DESC LIMIT ?";
  params.push(limit);

  const rows = db.prepare(query).all(...params);

  return NextResponse.json({ ok: true, data: rows }, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}