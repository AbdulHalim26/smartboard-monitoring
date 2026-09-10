"use client";

import type { MLClassification, MLPredictedStatus } from "@/lib/types";

export interface LiveClassification extends MLClassification {
  reasons?: string[];
  is_live?: boolean;
}

const statusStyle: Record<MLPredictedStatus, { bg: string; text: string; border: string }> = {
  NORMAL: { bg: "bg-emerald-500/10", text: "text-emerald-300", border: "border-emerald-500/30" },
  WASPADA: { bg: "bg-amber-500/10", text: "text-amber-300", border: "border-amber-500/30" },
  BAHAYA: { bg: "bg-red-500/10", text: "text-red-300", border: "border-red-500/30" },
};

const statusIcon: Record<MLPredictedStatus, string> = {
  NORMAL: "\u2705",
  WASPADA: "\u26A0\uFE0F",
  BAHAYA: "\uD83D\uDEA8",
};

export function MLClassificationCard({ data }: { data: MLClassification | null }) {
  if (!data) {
    return (
      <div className="hud-panel rounded-2xl p-5">
        <p className="hud-note">Belum ada klasifikasi ML</p>
      </div>
    );
  }

  const s = statusStyle[data.predicted_status];
  const ts = new Date(data.created_at).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className={`hud-panel rounded-2xl border p-5 ${s.border}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-lg">{statusIcon[data.predicted_status]}</span>
          <span className="hud-title truncate">Klasifikasi AI</span>
        </div>
        <span className="tnum shrink-0 text-[11px] text-slate-500">{ts}</span>
      </div>

      <div className="mt-3 flex items-baseline gap-3">
        <span className={`text-2xl font-bold ${s.text}`}>{data.predicted_status}</span>
        <span className="text-sm text-slate-400">
          confidence {Math.round((data.confidence ?? 0) * 1000) / 10}%
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-400">
        <div>
          <span className="text-slate-500">Suhu</span>
          <span className="ml-1 font-medium text-slate-200">{data.temperature?.toFixed(1)}&deg;C</span>
        </div>
        <div>
          <span className="text-slate-500">Hum</span>
          <span className="ml-1 font-medium text-slate-200">{data.humidity?.toFixed(0)}%</span>
        </div>
        <div>
          <span className="text-slate-500">Gas</span>
          <span className="ml-1 font-medium text-slate-200">{data.gas_value}</span>
        </div>
      </div>

      {(data as LiveClassification).reasons?.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(data as LiveClassification).reasons!.map((r) => (
            <span
              key={r}
              className="rounded-md bg-white/5 px-2 py-0.5 text-[11px] text-slate-300"
            >
              {r}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}