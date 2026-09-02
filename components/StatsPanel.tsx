import type { StatsResult } from "@/lib/types";

interface StatsPanelProps {
  stats: StatsResult | null;
}

const fmt0 = (n: number) => (Number.isFinite(n) ? n.toLocaleString("id-ID") : "--");
const fmt1 = (n: number) => (Number.isFinite(n) ? n.toFixed(1) : "--");

export function StatsPanel({ stats }: StatsPanelProps) {
  if (!stats) return null;
  return (
    <div className="hud-panel rounded-2xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
          24 Jam
        </h2>
        <span className="rounded-full bg-red-500/15 px-2.5 py-0.5 text-[11px] font-bold text-red-300">
          {stats.alert_count} alert
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <Mini label="Temp" unit="°C" color="text-orange-300" avg={fmt1(stats.avg_temp)} min={fmt1(stats.min_temp)} max={fmt1(stats.max_temp)} />
        <Mini label="Hum" unit="%" color="text-sky-300" avg={fmt1(stats.avg_hum)} min={fmt1(stats.min_hum)} max={fmt1(stats.max_hum)} />
        <Mini label="Gas" unit="ADC" color="text-lime-300" avg={fmt0(stats.avg_gas)} min="-" max={fmt0(stats.max_gas)} />
      </div>
    </div>
  );
}

function Mini({
  label,
  unit,
  color,
  avg,
  min,
  max,
}: {
  label: string;
  unit: string;
  color: string;
  avg: string;
  min: string;
  max: string;
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
      <div className="mb-2 flex items-baseline justify-between text-[11px] uppercase tracking-wide text-slate-500">
        <span>{label}</span>
        <span className="text-[10px]">{unit}</span>
      </div>
      <div className={`tnum text-lg font-bold ${color}`}>{avg}</div>
      <div className="mt-2 flex justify-between text-[11px] text-slate-400">
        <span>
          min <span className="tnum text-slate-300">{min}</span>
        </span>
        <span>
          max <span className="tnum text-slate-300">{max}</span>
        </span>
      </div>
    </div>
  );
}
