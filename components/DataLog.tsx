import type { TelemetryRow } from "@/lib/types";

interface DataLogProps {
  data: TelemetryRow[];
}

function gasQual(gas: number) {
  if (gas <= 1500) return { label: "Good", cls: "text-emerald-300" };
  if (gas <= 3500) return { label: "Moderate", cls: "text-yellow-300" };
  return { label: "Poor", cls: "text-red-300" };
}

export function DataLog({ data }: DataLogProps) {
  const rows = data
    .slice()
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .slice(0, 50);

  return (
    <div className="hud-panel overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
          Log Data Real-time
        </h2>
        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] font-medium text-slate-400">
          interval ±30 dtk
        </span>
      </div>
      <div className="max-h-96 overflow-y-auto">
        <table className="w-full text-left text-[13px]">
          <thead className="sticky top-0 bg-[#0d1322]">
            <tr className="border-b border-white/5 text-[11px] uppercase tracking-wider text-slate-500">
              <th className="px-5 py-3 font-medium">Waktu</th>
              <th className="px-5 py-3 text-right font-medium">Suhu</th>
              <th className="px-5 py-3 text-right font-medium">Kelembapan</th>
              <th className="px-5 py-3 text-right font-medium">Gas</th>
              <th className="px-5 py-3 text-right font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-slate-500">
                  Belum ada data.
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const gq = gasQual(r.gas_value ?? 0);
                const isAlert = r.status === "ALERT";
                return (
                  <tr
                    key={r.id}
                    className={`border-b border-white/[0.03] transition-colors hover:bg-white/[0.02] ${
                      isAlert ? "bg-red-500/[0.04]" : ""
                    }`}
                  >
                    <td className="whitespace-nowrap px-5 py-2.5 tnum text-slate-400">
                      {new Date(r.created_at).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                    <td className="px-5 py-2.5 text-right tnum text-orange-300">
                      {r.temperature != null ? r.temperature.toFixed(1) : "—"}°
                    </td>
                    <td className="px-5 py-2.5 text-right tnum text-sky-300">
                      {r.humidity != null ? r.humidity.toFixed(0) : "—"}%
                    </td>
                    <td className="px-5 py-2.5 text-right tnum text-slate-200">
                      {r.gas_value ?? "—"}{" "}
                      <span className={`ml-1 text-[11px] ${gq.cls}`}>{gq.label}</span>
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                          isAlert
                            ? "bg-red-500/15 text-red-300"
                            : "bg-emerald-500/10 text-emerald-300"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}