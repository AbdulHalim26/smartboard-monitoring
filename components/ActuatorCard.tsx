interface ActuatorCardProps {
  fanOn: boolean;
  buzzerOn: boolean;
  ledRedOn: boolean;
  ledGreenOn: boolean;
}

function Toggle({
  label,
  on,
  onColor,
  onGlow,
}: {
  label: string;
  on: boolean;
  onColor: string;
  onGlow: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
      <div className="flex items-center gap-2.5">
        <span
          className={`h-2.5 w-2.5 rounded-full ${on ? onColor : "bg-slate-600"} ${on ? "shadow" : ""}`}
        />
        <span className="text-sm font-medium text-slate-200">{label}</span>
      </div>
      <div
        className={`relative h-6 w-11 rounded-full transition-colors ${
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
  );
}

export function ActuatorCard({
  fanOn,
  buzzerOn,
  ledRedOn,
  ledGreenOn,
}: ActuatorCardProps) {
  return (
    <div className="hud-panel rounded-2xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
          Aktuator
        </h2>
        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] font-medium text-slate-400">
          Status output
        </span>
      </div>
      <div className="grid grid-cols-1 gap-2.5">
        <Toggle
          label="Fan (Relay)"
          on={fanOn}
          onColor="bg-cyan-400"
          onGlow="bg-cyan-500/70"
        />
        <Toggle
          label="Buzzer"
          on={buzzerOn}
          onColor="bg-amber-400"
          onGlow="bg-amber-500/70"
        />
        <Toggle
          label="LED Merah"
          on={ledRedOn}
          onColor="bg-red-400"
          onGlow="bg-red-500/70"
        />
        <Toggle
          label="LED Hijau"
          on={ledGreenOn}
          onColor="bg-emerald-400"
          onGlow="bg-emerald-500/70"
        />
      </div>
    </div>
  );
}
