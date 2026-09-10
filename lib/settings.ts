import { db } from "./db";
import { THRESHOLDS, type ThresholdSettings } from "./thresholds";

const KEYS = {
  GAS: "gas_threshold",
  TEMP: "temp_threshold",
  HUM: "hum_threshold",
  AUTO: "auto_control",
} as const;

const num = (v: string | undefined, fallback: number) => {
  if (v === undefined) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export function getThresholdSettings(): ThresholdSettings {
  const rows = db
    .prepare("SELECT key, value FROM settings")
    .all() as { key: string; value: string }[];
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return {
    gas: num(map.get(KEYS.GAS), THRESHOLDS.GAS),
    temp: num(map.get(KEYS.TEMP), THRESHOLDS.TEMP),
    hum: num(map.get(KEYS.HUM), THRESHOLDS.HUM),
    autoControl: map.get(KEYS.AUTO) !== "0",
  };
}

export function saveThresholdSettings(s: ThresholdSettings) {
  const upsert = db.prepare(
    "INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now','localtime')) " +
      "ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at"
  );
  const t = db.transaction(() => {
    upsert.run(KEYS.GAS, String(s.gas));
    upsert.run(KEYS.TEMP, String(s.temp));
    upsert.run(KEYS.HUM, String(s.hum));
    upsert.run(KEYS.AUTO, s.autoControl ? "1" : "0");
  });
  t();
}