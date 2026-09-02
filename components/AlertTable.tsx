import type { AlertRow } from "@/lib/types";

interface AlertTableProps {
  alerts: AlertRow[];
}

const TYPE_STYLE: Record<string, { badge: string; bar: string }> = {
  GAS: { badge: "bg-lime-500/15 text-lime-300", bar: "bg-lime-400" },
  TEMP: { badge: "bg-orange-500/15 text-orange-300", bar: "bg-orange-400" },
  HUM: { badge: "bg-sky-500/15 text-sky-300", bar: "bg-sky-400" },
};

export function AlertTable({ alerts }: AlertTableProps) {
  return (
    <div className="hud-panel overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
          Riwayat Alert
        </h2>
        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] font-medium text-slate-400">
          {alerts.length} entri
        </span>
      </div>
      <div className="max-h-96 overflow-y-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-[#0d1322]">
            <tr className="border-b border-white/5 text-[11px] uppercase tracking-wider text-slate-500">
              <th className="px-5 py-3 font-medium">Waktu</th>
              <th className="px-5 py-3 font-medium">Jenis</th>
              <th className="px-5 py-3 font-medium">Pesan</th>
              <th className="px-5 py-3 font-medium">Nilai vs Ambang</th>
            </tr>
          </thead>
          <tbody>
            {alerts.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-slate-500">
                  Belum ada alert — semua aman.
                </td>
              </tr>
            ) : (
              alerts.map((a) => {
                const st = TYPE_STYLE[a.alert_type] ?? {
                  badge: "bg-slate-500/15 text-slate-300",
                  bar: "bg-slate-400",
                };
                return (
                  <tr
                    key={a.id}
                    className="border-b border-white/[0.03] transition-colors hover:bg-white/[0.02]"
                  >
                    <td className="whitespace-nowrap px-5 py-3 tnum text-slate-400">
                      <div>{new Date(a.created_at).toLocaleDateString("id-ID")}</div>
                      <div className="text-xs text-slate-500">
                        {new Date(a.created_at).toLocaleTimeString("id-ID")}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="flex items-center gap-1.5">
                        <span className={`h-1.5 w-1.5 rounded-full ${st.bar}`} />
                        <span className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${st.badge}`}>
                          {a.alert_type}
                        </span>
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-200">{a.message}</td>
                    <td className="whitespace-nowrap px-5 py-3 tnum text-slate-300">
                      <span className={a.value && a.threshold && a.value > a.threshold ? "text-red-300" : ""}>
                        {a.value ?? "—"}
                      </span>{" "}
                      <span className="text-slate-500">/</span>{" "}
                      <span className="text-slate-500">{a.threshold ?? "—"}</span>
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