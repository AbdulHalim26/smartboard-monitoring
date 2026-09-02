"use client";

import type { MLClassification, MLPredictedStatus } from "@/lib/types";

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
      <div className="rounded-2xl border border-slate-700/50 bg-slate-900/50 p-5 backdrop-blur">
        <p className="text-sm text-slate-500">Belum ada klasifikasi ML</p>
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
    <div className={`rounded-2xl border ${s.border} ${s.bg} p-5 backdrop-blur`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{statusIcon[data.predicted_status]}</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Klasifikasi AI
          </span>
        </div>
        <span className="text-[11px] text-slate-500">{ts}</span>
      </div>

      <div className="mt-3 flex items-baseline gap-3">
        <span className={`text-2xl font-bold ${s.text}`}>{data.predicted_status}</span>
        <span className="text-sm text-slate-400">
          confidence {(data.confidence * 100).toFixed(1)}%
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
    </div>
  );
}
