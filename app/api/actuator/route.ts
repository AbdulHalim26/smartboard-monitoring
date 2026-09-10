import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const deviceId = url.searchParams.get("device_id") ?? "esp32-room-01";

  const pending = db.prepare(
    "SELECT * FROM device_commands WHERE device_id = ? AND executed = 0 ORDER BY id ASC LIMIT 10"
  ).all(deviceId);

  return NextResponse.json({ ok: true, data: pending }, {
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

  const { device_id, command, payload } = body as {
    device_id?: string;
    command?: string;
    payload?: string;
  };

  if (!command) {
    return NextResponse.json({ ok: false, error: "command wajib" }, { status: 400 });
  }

  const validCommands = ["fan_on", "fan_off", "buzzer_on", "buzzer_off", "led_red_on", "led_red_off", "led_green_on", "led_green_off", "all_on", "all_off", "auto", "autocloud"];
  if (!validCommands.includes(command)) {
    return NextResponse.json({ ok: false, error: `command tidak valid. Valid: ${validCommands.join(", ")}` }, { status: 400 });
  }

  const result = db.prepare(
    "INSERT INTO device_commands (device_id, command, payload) VALUES (?, ?, ?)"
  ).run(device_id ?? "esp32-room-01", command, payload ?? null);

  return NextResponse.json({ ok: true, id: result.lastInsertRowid, command }, { status: 201 });
}

export async function PATCH(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body bukan JSON" }, { status: 400 });
  }

  const { id } = body as { id?: number };
  if (!id) {
    return NextResponse.json({ ok: false, error: "id wajib" }, { status: 400 });
  }

  db.prepare("UPDATE device_commands SET executed = 1 WHERE id = ?").run(id);

  return NextResponse.json({ ok: true });
}
