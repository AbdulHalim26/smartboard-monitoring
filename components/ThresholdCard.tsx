"use client";

import { useState } from "react";
import type { ThresholdSettings } from "@/lib/thresholds";

interface ThresholdCardProps {
  settings: ThresholdSettings;
  current: {
    temperature: number | null;
    humidity: number | null;
    gas_value: number | null;
  } | null;
  onSave: (s: ThresholdSettings) => Promise<boolean>;
}

function Field({
  label,
  unit,
  value,
  current,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  unit: string;
  value: number;
  current: number | null;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  const over = current != null && current > value;
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="mb-2 flex items-baseline justify-between text-[11px] uppercase tracking-wide text-slate-500">
        <span>{label}</span>
        <span className="text-[10px]">{unit}</span>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="tnum w-full rounded-lg border border-white/10 bg-slate-950/50 px-2 py-1.5 text-lg font-bold text-slate-100 outline-none focus:border-cyan-500/50"
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px]">
        <span className="text-slate-500">
          sekarang:{" "}
          <span className={`tnum font-semibold ${over ? "text-red-300" : "text-slate-300"}`}>
            {current != null ? current.toFixed(1) : "--"}
          </span>
        </span>
        {over && <span className="font-bold text-red-300">sedang melebihi!</span>}
      </div>
    </div>
  );
}

export function ThresholdCard({ settings, current, onSave }: ThresholdCardProps) {
  const [gas, setGas] = useState(settings.gas);
  const [temp, setTemp] = useState(settings.temp);
  const [hum, setHum] = useState(settings.hum);
  const [autoControl, setAutoControl] = useState(settings.autoControl);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="hud-panel rounded-2xl p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="hud-title">Kalibrasi Threshold</h2>
        <span className="hud-chip">Auto-kontrol</span>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <Field
          label="Suhu"
          unit="°C"
          value={temp}
          current={current?.temperature ?? null}
          min={10}
          max={60}
          step={0.1}
          onChange={setTemp}
        />
        <Field
          label="Kelembapan"
          unit="% RH"
          value={hum}
          current={current?.humidity ?? null}
          min={20}
          max={100}
          step={1}
          onChange={setHum}
        />
        <Field
          label="Gas / Asap"
          unit="ADC"
          value={gas}
          current={current?.gas_value ?? null}
          min={50}
          max={4095}
          step={10}
          onChange={setGas}
        />
      </div>

      <label className="mt-3 flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2.5">
        <div>
          <div className="text-sm font-medium text-slate-200">
            Nyalakan aktuator otomatis saat threshold terlampaui
          </div>
          <div className="text-[11px] text-slate-500">
            Fan + relay + buzzer + LED merah ON, LED hijau OFF
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={autoControl}
          onClick={() => setAutoControl((v) => !v)}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
            autoControl ? "bg-cyan-500/70" : "bg-slate-700"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
              autoControl ? "left-[calc(100%-1.375rem)]" : "left-0.5"
            }`}
          />
        </button>
      </label>

      <button
        type="button"
        disabled={saving}
        onClick={async () => {
          setSaving(true);
          setMsg(null);
          const ok = await onSave({ gas, temp, hum, autoControl });
          setMsg(
            ok
              ? "Threshold tersimpan — berlaku untuk bacaan telemetry berikutnya."
              : "Gagal menyimpan threshold."
          );
          setSaving(false);
        }}
        className="mt-3 w-full rounded-xl border border-cyan-500/30 bg-cyan-500/15 py-2.5 text-sm font-bold text-cyan-200 transition-colors hover:bg-cyan-500/25 active:scale-[0.99] disabled:opacity-50"
      >
        {saving ? "Menyimpan..." : "Simpan Threshold"}
      </button>

      {msg && (
        <div
          className={`mt-2 rounded-lg px-3 py-2 text-xs ${
            msg.startsWith("Gagal")
              ? "border border-red-500/30 bg-red-500/10 text-red-300"
              : "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
          }`}
        >
          {msg}
        </div>
      )}

      <p className="hud-note mt-3">
        Kalibrasi sesuai kondisi ruanganmu. Saat bacaan sensor melewati batas, sistem
        langsung mengirim perintah ke ESP32 untuk menyalakan fan/relay &amp; buzzer.
      </p>
    </div>
  );
}