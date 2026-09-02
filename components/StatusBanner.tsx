import type { AlertType } from "@/lib/thresholds";

interface StatusBannerProps {
  status: "NORMAL" | "ALERT";
  reasons: AlertType[];
}

const LABELS: Record<AlertType, string> = {
  GAS: "Kualitas udara buruk (gas tinggi)!",
  TEMP: "Suhu terlalu tinggi!",
  HUM: "Kelembapan terlalu tinggi!",
};

export function StatusBanner({ status, reasons }: StatusBannerProps) {
  const isAlert = status === "ALERT";
  return (
    <div
      className={`relative flex w-full flex-col overflow-hidden rounded-2xl border px-6 py-5 sm:flex-row sm:items-center sm:justify-between ${
        isAlert
          ? "border-red-500/40 bg-gradient-to-r from-red-950/80 to-red-900/50"
          : "border-emerald-500/30 bg-gradient-to-r from-emerald-950/70 to-emerald-900/40"
      }`}
    >
      <div
        className={`pointer-events-none absolute inset-y-0 left-0 w-1.5 ${
          isAlert ? "bg-red-400" : "bg-emerald-400"
        }`}
      />
      <div className="flex items-center gap-4">
        <span className="relative flex h-4 w-4">
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${
              isAlert ? "bg-red-400" : "bg-emerald-400"
            }`}
          />
          <span
            className={`relative inline-flex h-4 w-4 rounded-full ${
              isAlert ? "bg-red-400" : "bg-emerald-400"
            }`}
          />
        </span>
        <div>
          <div
            className={`tnum text-2xl font-black tracking-tight ${
              isAlert ? "text-red-200" : "text-emerald-200"
            }`}
          >
            {status === "ALERT" ? "SYSTEM ALERT" : "SYSTEM NORMAL"}
          </div>
          <div className={`text-sm ${isAlert ? "text-red-300/80" : "text-emerald-300/80"}`}>
            {isAlert
              ? "Beberapa parameter melewati ambang batas"
              : "Semua parameter dalam batas normal"}
          </div>
        </div>
      </div>

      {isAlert && (
        <ul className="mt-4 space-y-1 sm:mt-0 sm:text-right">
          {reasons.map((r) => (
            <li
              key={r}
              className={`rounded-md px-2 py-1 text-sm font-medium ${
                r === "GAS"
                  ? "bg-lime-500/15 text-lime-200"
                  : r === "TEMP"
                    ? "bg-orange-500/15 text-orange-200"
                    : "bg-sky-500/15 text-sky-200"
              }`}
            >
              {LABELS[r]}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
