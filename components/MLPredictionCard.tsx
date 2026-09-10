"use client";

const colLabel: Record<string, string> = {
  temperature: "Suhu",
  humidity: "Kelembapan",
  gas_value: "Gas",
};

const colUnit: Record<string, string> = {
  temperature: "\u00B0C",
  humidity: "%",
  gas_value: "ADC",
};

const colColor: Record<string, string> = {
  temperature: "text-orange-300",
  humidity: "text-sky-300",
  gas_value: "text-lime-300",
};

export interface LivePrediction {
  temperature: number;
  humidity: number;
  gas_value: number;
}

export function MLPredictionCard({
  live,
}: {
  live: LivePrediction | null;
}) {
  if (!live) {
    return (
      <div className="hud-panel rounded-2xl p-5">
        <p className="hud-note">Belum ada prediksi — tunggu data sensor masuk.</p>
      </div>
    );
  }

  const items: { key: "temperature" | "humidity" | "gas_value"; label: string; value: number; unit: string }[] = [
    { key: "temperature", label: colLabel.temperature, value: live.temperature, unit: colUnit.temperature },
    { key: "humidity", label: colLabel.humidity, value: live.humidity, unit: colUnit.humidity },
    { key: "gas_value", label: colLabel.gas_value, value: live.gas_value, unit: colUnit.gas_value },
  ];

  return (
    <div className="hud-panel rounded-2xl border border-purple-500/30 p-5">
      <div className="flex min-w-0 items-center gap-2">
        <span className="shrink-0 text-lg">{"\uD83D\uDD2E"}</span>
        <span className="hud-title truncate">Prediksi Bacaan Berikutnya</span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {items.map((it) => (
          <div key={it.key} className="rounded-lg bg-slate-950/40 px-2 py-2.5">
            <div className="text-[10px] text-slate-500">{it.label}</div>
            <div className={`tnum text-lg font-bold ${colColor[it.key]}`}>
              {it.value.toFixed(1)}
              <span className="ml-0.5 text-[11px] font-normal text-slate-500">{it.unit}</span>
            </div>
          </div>
        ))}
      </div>

      <p className="hud-note mt-3">
        Prediksi berbasis tren (regresi linier) dari 5 bacaan terakhir sensor.
      </p>
    </div>
  );
}