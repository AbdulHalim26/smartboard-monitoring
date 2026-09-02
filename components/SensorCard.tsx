interface SensorCardProps {
  title: string;
  value: string | number;
  unit: string;
  icon: string;
  accent: "temp" | "hum" | "gas";
  statusColor: "green" | "yellow" | "red" | "default";
}

const accentMap = {
  temp: {
    bar: "from-orange-500 to-amber-400",
    text: "text-orange-300",
    glow: "after:bg-orange-500/20",
    color: "#fb923c",
  },
  hum: {
    bar: "from-sky-500 to-cyan-400",
    text: "text-sky-300",
    glow: "after:bg-sky-500/20",
    color: "#38bdf8",
  },
  gas: {
    bar: "from-lime-500 to-green-400",
    text: "text-lime-300",
    glow: "after:bg-lime-500/20",
    color: "#a3e635",
  },
};

const stateMap: Record<SensorCardProps["statusColor"], string> = {
  green: "text-emerald-300",
  yellow: "text-yellow-300",
  red: "text-red-300",
  default: "text-slate-400",
};

const stateDot: Record<SensorCardProps["statusColor"], string> = {
  green: "bg-emerald-400",
  yellow: "bg-yellow-400",
  red: "bg-red-400",
  default: "bg-slate-500",
};

export function SensorCard({
  title,
  value,
  unit,
  icon,
  accent,
  statusColor,
}: SensorCardProps) {
  const a = accentMap[accent];
  return (
    <div className="hud-panel relative overflow-hidden rounded-2xl p-5">
      <div
        className={`pointer-events-none absolute inset-0 after:absolute after:-top-10 after:left-1/2 after:h-24 after:w-64 after:-translate-x-1/2 after:rounded-full after:blur-3xl ${a.glow}`}
      />
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          <span className="text-base">{icon}</span>
          <span>{title}</span>
        </div>
        <span
          className={`flex h-2.5 w-2.5 items-center justify-center`}
        >
          <span className={`h-2.5 w-2.5 rounded-full ${stateDot[statusColor]} ${statusColor === "default" ? "" : "animate-pulse"}`} />
        </span>
      </div>

      <div className="relative mt-4 flex items-baseline gap-1.5">
        <span className={`tnum text-5xl font-bold leading-none ${a.text}`}>
          {typeof value === "number" ? value.toLocaleString() : value}
        </span>
        <span className="tnum text-sm font-medium text-slate-400">{unit}</span>
      </div>

      <div className={`relative mt-3 h-1 w-full overflow-hidden rounded-full bg-white/5`}>
        <div className={`h-full w-2/3 rounded-full bg-gradient-to-r ${a.bar}`} />
      </div>
      <div className={`relative mt-1.5 text-[11px] font-medium uppercase tracking-wide ${stateMap[statusColor]}`}>
        {statusColor === "default" ? "—" : statusColor}
      </div>
    </div>
  );
}
