"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { TelemetryRow } from "@/lib/types";

interface TelemetryChartProps {
  data: TelemetryRow[];
}

export function TelemetryChart({ data }: TelemetryChartProps) {
  const chartData = data
    .slice()
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );

  return (
    <div className="hud-panel rounded-2xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
          Grafik Tren
        </h2>
        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] font-medium text-slate-400">
          24 jam · realtime
        </span>
      </div>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="created_at"
              stroke="#475569"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: "#1e293b" }}
              tickFormatter={(v: string) =>
                new Date(v).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              }
            />
            <YAxis
              stroke="#475569"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              width={40}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#0d1322",
                border: "1px solid #1e293b",
                borderRadius: "12px",
                color: "#e2e8f0",
                fontSize: "12px",
              }}
              labelFormatter={(v) => new Date(v as string).toLocaleString()}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: "#94a3b8" }} iconType="plainline" />
            <Line
              type="monotone"
              dataKey="temperature"
              name="Suhu (°C)"
              stroke="#fb923c"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="humidity"
              name="Kelembapan (%)"
              stroke="#38bdf8"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="gas_value"
              name="Gas (ADC)"
              stroke="#a3e635"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}