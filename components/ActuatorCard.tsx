"use client";

import { useState } from "react";

interface ActuatorCardProps {
  fanOn: boolean;
  buzzerOn: boolean;
  ledRedOn: boolean;
  ledGreenOn: boolean;
  gasThreshold: number;
  onToggle: (command: string, on: boolean) => Promise<boolean>;
}

type ActuatorKey = "fan" | "buzzer" | "led_red" | "led_green";

function Toggle({
  label,
  icon,
  on,
  onColor,
  onGlow,
  waiting,
  onToggle,
}: {
  label: string;
  icon: string;
  on: boolean;
  onColor: string;
  onGlow: string;
  waiting: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`group flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
        waiting
          ? "cursor-wait border-amber-500/40 bg-amber-500/[0.06]"
          : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06] active:scale-[0.98]"
      }`}
    >
      <div className="flex items-center gap-2.5">
        <span
          className={`h-2.5 w-2.5 rounded-full ${on ? onColor : "bg-slate-600"} ${
            on ? "shadow" : ""
          }`}
        />
        <span className="text-sm font-medium text-slate-200">{label}</span>
        <span className="text-xs">{icon}</span>
      </div>
      <div className="flex items-center gap-2">
        {waiting && (
          <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-300">
            menunggu ESP32
          </span>
        )}
        <div
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
            on ? onGlow : "bg-slate-700"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
              on ? "left-[calc(100%-1.375rem)]" : "left-0.5"
            }`}
          />
        </div>
      </div>
    </button>
  );
}

export function ActuatorCard({ fanOn, buzzerOn, ledRedOn, ledGreenOn, gasThreshold, onToggle }: ActuatorCardProps) {
  const [override, setOverride] = useState<Partial<Record<ActuatorKey, boolean>>>({});
  const [pendingKey, setPendingKey] = useState<ActuatorKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  const props: Record<ActuatorKey, boolean> = {
    fan: fanOn,
    buzzer: buzzerOn,
    led_red: ledRedOn,
    led_green: ledGreenOn,
  };

  // Saat ESP32 mengonfirmasi state asli (telemetry baru), hapus override yang sudah
  // cocok. Dilakukan saat render (bukan effect) supaya tidak cascade render.
  const staleKey = (Object.keys(override) as ActuatorKey[]).find(
    (k) => override[k] !== undefined && override[k] === props[k]
  );
  if (staleKey !== undefined) {
    setOverride((prev) => {
      if (prev[staleKey] === undefined) return prev;
      const next = { ...prev };
      delete next[staleKey];
      return next;
    });
  }

  const effective: Record<ActuatorKey, boolean> = {
    fan: override.fan ?? fanOn,
    buzzer: override.buzzer ?? buzzerOn,
    led_red: override.led_red ?? ledRedOn,
    led_green: override.led_green ?? ledGreenOn,
  };

  const waiting: Record<ActuatorKey, boolean> = {
    fan: override.fan !== undefined,
    buzzer: override.buzzer !== undefined,
    led_red: override.led_red !== undefined,
    led_green: override.led_green !== undefined,
  };

  const actuators: { key: ActuatorKey; label: string; icon: string; onColor: string; onGlow: string }[] = [
    { key: "fan", label: "Fan (Relay)", icon: "\uD83C\uDF43", onColor: "bg-cyan-400", onGlow: "bg-cyan-500/70" },
    { key: "buzzer", label: "Buzzer", icon: "\uD83D\uDD0A", onColor: "bg-amber-400", onGlow: "bg-amber-500/70" },
    { key: "led_red", label: "LED Merah", icon: "\uD83D\uDD34", onColor: "bg-red-400", onGlow: "bg-red-500/70" },
    { key: "led_green", label: "LED Hijau", icon: "\uD83D\uDFE2", onColor: "bg-emerald-400", onGlow: "bg-emerald-500/70" },
  ];

  const handleToggle = async (key: ActuatorKey) => {
    if (pendingKey) return;
    const on = effective[key];
    const nextOn = !on;
    setOverride((prev) => ({ ...prev, [key]: nextOn }));
    setPendingKey(key);
    setError(null);
    const command = `${key}_${nextOn ? "on" : "off"}`;
    const ok = await onToggle(command, nextOn);
    setPendingKey(null);
    if (!ok) {
      // batalkan override jika gagal kirim
      setOverride((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setError(`Gagal mengirim perintah ${command} — pastikan server terhubung.`);
    }
  };

  return (
    <div className="hud-panel rounded-2xl p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="hud-title">Aktuator</h2>
        <span className="hud-chip">Klik untuk kontrol</span>
      </div>

      <div className="grid grid-cols-1 gap-2.5">
        {actuators.map((a) => (
          <Toggle
            key={a.key}
            label={a.label}
            icon={a.icon}
            on={effective[a.key]}
            onColor={a.onColor}
            onGlow={a.onGlow}
            waiting={waiting[a.key]}
            onToggle={() => handleToggle(a.key)}
          />
        ))}
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}

      {Object.values(waiting).some(Boolean) && (
        <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          Perintah terkirim. ESP32 akan mengeksekusi dalam beberapa detik (polling tiap 15 dtk).
          State mengikuti ESP32 setelah telemetry berikutnya diterima.
        </div>
      )}

      <div className="mt-4 space-y-1.5 border-t border-white/5 pt-3 text-[11px] text-slate-500">
        <div className="flex items-center justify-between">
          <span>Ambang gas (fan + relay + buzzer + LED merah nyala)</span>
          <span className="tnum text-slate-300">{gasThreshold} ADC</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Suhu &amp; kelembapan</span>
          <span className="text-slate-400">atur di panel kalibrasi</span>
        </div>
      </div>

      <p className="hud-note mt-3">
        Perintah dikirim ke {`device_commands`} via {`/api/actuator`}. ESP32 polling tiap 15 detik.
      </p>
    </div>
  );
}