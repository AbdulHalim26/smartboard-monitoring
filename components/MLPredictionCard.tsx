"use client";

import type { MLPrediction } from "@/lib/types";

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
  temperature: "text-red-300",
  humidity: "text-blue-300",
  gas_value: "text-amber-300",
};

export function MLPredictionCard({ predictions }: { predictions: MLPrediction[] }) {
  if (!predictions.length) {
    return (
      <div className="rounded-2xl border border-slate-700/50 bg-slate-900/50 p-5 backdrop-blur">
        <p className="text-sm text-slate-500">Belum ada prediksi ARIMA</p>
      </div>
    );
  }

  // Group by target_timestamp, then by column
  const grouped = new Map<string, MLPrediction[]>();
  for (const p of predictions) {
    const key = p.target_timestamp;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(p);
  }

  // Take closest 3 forecasts
  const entries = [...grouped.entries()].slice(0, 3);

  return (
    <div className="rounded-2xl border border-purple-500/30 bg-purple-500/10 p-5 backdrop-blur">
      <div className="flex items-center gap-2">
        <span className="text-lg">{"\uD83D\uDD2E"}</span>
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Prediksi ARIMA
        </span>
      </div>

      <div className="mt-3 space-y-3">
        {entries.map(([targetTs, preds]) => {
          const created = preds[0]?.created_at ?? targetTs;
          const h = Math.round(
            (new Date(targetTs).getTime() - new Date(created).getTime()) / 3600000,
          );
          const label = h <= 0 ? "Sekarang" : `+${h} jam`;

          return (
            <div key={targetTs}>
              <div className="mb-1 text-[11px] font-medium text-slate-500">{label}</div>
              <div className="grid grid-cols-3 gap-2">
                {preds.map((p) => (
                  <div key={p.column_name} className="rounded-lg bg-slate-950/40 px-2 py-1.5">
                    <div className="text-[10px] text-slate-500">{colLabel[p.column_name]}</div>
                    <div className={`text-sm font-bold ${colColor[p.column_name]}`}>
                      {p.predicted_value.toFixed(1)}
                      <span className="ml-0.5 text-[10px] font-normal text-slate-500">
                        {colUnit[p.column_name]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
