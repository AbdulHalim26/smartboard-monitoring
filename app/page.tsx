"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { computeStatus, type AlertType } from "@/lib/thresholds";
import type { AlertRow, MLClassification, MLPrediction, StatsResult, TelemetryRow } from "@/lib/types";
import { SensorCard } from "@/components/SensorCard";
import { StatusBanner } from "@/components/StatusBanner";
import { ActuatorCard } from "@/components/ActuatorCard";
import { TelemetryChart } from "@/components/TelemetryChart";
import { AlertTable } from "@/components/AlertTable";
import { StatsPanel } from "@/components/StatsPanel";
import { DataLog } from "@/components/DataLog";
import { LiveClock } from "@/components/LiveClock";
import { LastSeen } from "@/components/LastSeen";
import { MLClassificationCard } from "@/components/MLClassificationCard";
import { MLPredictionCard } from "@/components/MLPredictionCard";

const isDemo = !supabase;

function makeDemoTelemetry(overrides: Partial<TelemetryRow> = {}): TelemetryRow {
  return {
    id: Date.now(),
    device_id: "esp32-room-01",
    temperature: 28.4,
    humidity: 67,
    gas_value: 2100,
    status: "NORMAL",
    fan_on: false,
    buzzer_on: false,
    led_red_on: false,
    led_green_on: true,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function gasLabel(gas: number) {
  if (gas <= 1500) return { label: "Good", color: "green" as const };
  if (gas <= 3500) return { label: "Moderate", color: "yellow" as const };
  return { label: "Poor", color: "red" as const };
}

export default function DashboardPage() {
  const [latest, setLatest] = useState<TelemetryRow | null>(null);
  const [history, setHistory] = useState<TelemetryRow[]>([]);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [stats, setStats] = useState<StatsResult | null>(null);
  const [offline, setOffline] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [mlLatest, setMlLatest] = useState<MLClassification | null>(null);
  const [mlPredictions, setMlPredictions] = useState<MLPrediction[]>([]);

  const hydrate = useCallback((row: TelemetryRow) => {
    setLatest(row);
    setLastUpdate(Date.now());
    setHistory((prev) => {
      const next = [row, ...prev.filter((r) => r.id !== row.id)];
      return next.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    });
  }, []);

  const ingestDemo = useCallback(
    (row: TelemetryRow) => {
      hydrate(row);
      const { status, reasons } = computeStatus({
        gas_value: row.gas_value ?? 0,
        temperature: row.temperature ?? 0,
        humidity: row.humidity ?? 0,
      });
      if (status === "ALERT") {
        const nowIso = new Date().toISOString();
        const newAlerts = reasons.map((r, i) => ({
          id: Date.now() + i,
          telemetry_id: row.id,
          device_id: row.device_id,
          alert_type: r,
          message:
            r === "GAS"
              ? "Kualitas udara buruk (gas tinggi)!"
              : r === "TEMP"
                ? "Suhu terlalu tinggi!"
                : "Kelembapan terlalu tinggi!",
          value: r === "GAS" ? row.gas_value : r === "TEMP" ? row.temperature : row.humidity,
          threshold: r === "GAS" ? 3500 : r === "TEMP" ? 40.0 : 75.0,
          created_at: nowIso,
        }));
        setAlerts((prev) => [...newAlerts, ...prev].slice(0, 200));
      }
    },
    [hydrate],
  );

  const refreshStats = useCallback(async () => {
    try {
      const res = await fetch("/api/stats?hours=24", { cache: "no-store" });
      const json = await res.json();
      if (json.ok) {
        setStats({
          avg_temp: json.avg_temp,
          min_temp: json.min_temp,
          max_temp: json.max_temp,
          avg_hum: json.avg_hum,
          min_hum: json.min_hum,
          max_hum: json.max_hum,
          avg_gas: json.avg_gas,
          max_gas: json.max_gas,
          alert_count: json.alert_count,
        });
        setFetchError(null);
      } else {
        setFetchError(`/api/stats: ${json.error ?? "response tidak ok"}`);
      }
    } catch (err) {
      setFetchError(`/api/stats gagal: ${(err as Error).message}`);
    }
  }, []);

  const refreshAlerts = useCallback(async () => {
    try {
      const res = await fetch("/api/alerts?limit=50", { cache: "no-store" });
      const json = await res.json();
      if (json.ok) {
        setAlerts(json.data ?? []);
        setFetchError(null);
      } else {
        setFetchError(`/api/alerts: ${json.error ?? "response tidak ok"}`);
      }
    } catch (err) {
      setFetchError(`/api/alerts gagal: ${(err as Error).message}`);
    }
  }, []);

  const refreshLatest = useCallback(async () => {
    try {
      const res = await fetch("/api/telemetry/latest", { cache: "no-store" });
      const json = await res.json();
      if (json.ok && json.data) {
        hydrate(json.data);
        setOffline(false);
        setFetchError(null);
      } else {
        setFetchError(`/api/telemetry/latest: ${json.error ?? "tidak ada data"}`);
      }
    } catch (err) {
      setFetchError(`/api/telemetry/latest gagal: ${(err as Error).message}`);
    }
  }, [hydrate]);

  const refreshHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/telemetry?limit=200", { cache: "no-store" });
      const json = await res.json();
      if (json.ok) {
        setHistory(
          [...(json.data ?? [])].sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime(),
          ),
        );
        setFetchError(null);
      } else {
        setFetchError(`/api/telemetry: ${json.error ?? "response tidak ok"}`);
      }
    } catch (err) {
      setFetchError(`/api/telemetry gagal: ${(err as Error).message}`);
    }
  }, []);

  const refreshML = useCallback(async () => {
    if (isDemo) return;
    try {
      const res = await fetch("/api/ml?limit=5", { cache: "no-store" });
      const json = await res.json();
      if (json.ok) {
        const cls = json.classifications as MLClassification[];
        if (cls.length) setMlLatest(cls[0]);
        setMlPredictions(json.predictions as MLPrediction[]);
      }
    } catch {
      // ML backend belum jalan — silent fail
    }
  }, []);

  const refreshAll = useCallback(() => {
    refreshLatest();
    refreshHistory();
    refreshAlerts();
    refreshStats();
    refreshML();
  }, [refreshLatest, refreshHistory, refreshAlerts, refreshStats, refreshML]);

  useEffect(() => {
    if (isDemo) {
      const seedTimer = setTimeout(() => {
        hydrate(makeDemoTelemetry());
        setStats({
          avg_temp: 28.3,
          min_temp: 24.1,
          max_temp: 32.7,
          avg_hum: 65.2,
          min_hum: 55.0,
          max_hum: 78.4,
          avg_gas: 2100,
          max_gas: 3900,
          alert_count: 4,
        });
      }, 0);

      // Demo: bacaan baru tiap ±30 detik (pola log data sesuai request)
      const demoCycle = [
        { gas_value: 1850 },
        { gas_value: 2100, temperature: 28.7, humidity: 66 },
        { gas_value: 2450, temperature: 29.1, humidity: 68 },
        { gas_value: 2720, temperature: 29.4, humidity: 69 },
        { gas_value: 3120, temperature: 29.8, humidity: 71 },
        { gas_value: 3900, status: "ALERT", fan_on: true, buzzer_on: true, led_red_on: true, led_green_on: false },
      ] as const;
      let i = 0;
      const demo = setInterval(() => {
        const step = demoCycle[i % demoCycle.length];
        i++;
        ingestDemo(makeDemoTelemetry(step));
      }, 30_000);
      return () => {
        clearTimeout(seedTimer);
        clearInterval(demo);
      };
    }

    const initialLoadTimer = setTimeout(refreshAll, 0);

    // Polling 5s: data terbaru + alert + stats
    const pollTimer = setInterval(() => {
      refreshLatest();
      refreshAlerts();
      refreshStats();
    }, 5000);

    // Reset penuh tiap 30 detik: history/graph relog seluruh data
    const cycleTimer = setInterval(refreshAll, 30_000);

    return () => {
      clearTimeout(initialLoadTimer);
      clearInterval(pollTimer);
      clearInterval(cycleTimer);
    };
  }, [refreshAll, refreshLatest, refreshAlerts, refreshStats, hydrate, ingestDemo]);

  useEffect(() => {
    if (isDemo) return;

    const channel = supabase
      ?.channel("telemetry-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "telemetry" },
        (payload) => {
          hydrate(payload.new as TelemetryRow);
          setOffline(false);
          refreshAlerts();
          refreshStats();
        },
      )
      .subscribe();

    return () => {
      supabase?.removeChannel(channel as never);
    };
  }, [hydrate, refreshAlerts, refreshStats]);

  // Deteksi offline: reset/nyalakan tiap 1 detik jika > 30 detik tanpa data
  useEffect(() => {
    if (isDemo) return;
    const offlineTimer = setInterval(() => {
      if (lastUpdate && Date.now() - lastUpdate > 30_000) {
        setOffline(true);
      }
    }, 1000);
    return () => clearInterval(offlineTimer);
  }, [lastUpdate]);

  const status = latest
    ? computeStatus({
        gas_value: latest.gas_value ?? 0,
        temperature: latest.temperature ?? 0,
        humidity: latest.humidity ?? 0,
      })
    : { status: "NORMAL" as const, reasons: [] as AlertType[] };

  const gas = gasLabel(latest?.gas_value ?? 2100);

  const timeFmt = (t: number) =>
    new Date(t).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  return (    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-5 px-4 py-6 sm:px-6">
      {isDemo && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-200">
          {"\u26A0\uFE0F"} Mode demo: Supabase belum dikonfigurasi. Data berupa
          simulasi (±30 detik per bacaan). Tambahkan env &amp; jalankan SQL schema untuk mode live.
        </div>
      )}

      {fetchError && (
        <div className="flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          <span className="mt-0.5">{"\u26A0\uFE0F"}</span>
          <span>
            <b>Fetch error:</b> {fetchError}
          </span>
        </div>
      )}

      {/* Top bar */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-sky-600 text-lg shadow-lg shadow-cyan-500/20">
            {"\uD83D\uDCA1"}
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight tracking-tight text-slate-100">
              Smart Room Monitoring
            </h1>
            <p className="text-xs text-slate-500">
              ESP32 · DHT11 + MQ-135 · <LiveClock />
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-bold ${
              offline
                ? "border-red-500/40 bg-red-500/10 text-red-300"
                : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span
                className={`absolute h-full w-full animate-ping rounded-full opacity-60 ${
                  offline ? "bg-red-400" : "bg-emerald-400"
                }`}
              />
              <span
                className={`relative h-2 w-2 rounded-full ${
                  offline ? "bg-red-400" : "bg-emerald-400"
                }`}
              />
            </span>
            {offline ? "OFFLINE" : "LIVE"}
          </span>
          {lastUpdate && (
            <span className="text-xs text-slate-500">
              update terakhir{" "}
              <span className="tnum text-slate-300">{timeFmt(lastUpdate)}</span>{" "}
              <LastSeen ts={lastUpdate} />
            </span>
          )}
        </div>
      </header>

      <StatusBanner status={status.status} reasons={status.reasons} />

      {/* Sensor readouts */}
      {latest && (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SensorCard
            title="Suhu"
            icon="\uD83C\uDF21\uFE0F"
            accent="temp"
            value={latest.temperature != null ? latest.temperature.toFixed(1) : "--"}
            unit="°C"
            statusColor={
              latest.temperature != null && latest.temperature > 40 ? "red" : "default"
            }
          />
          <SensorCard
            title="Kelembapan"
            icon="\uD83D\uDCA7"
            accent="hum"
            value={latest.humidity != null ? latest.humidity.toFixed(0) : "--"}
            unit="%RH"
            statusColor={
              latest.humidity != null && latest.humidity > 75 ? "red" : "default"
            }
          />
          <SensorCard
            title="Gas"
            icon="\uD83C\uDF2B\uFE0F"
            accent="gas"
            value={latest.gas_value ?? "--"}
            unit="ADC"
            statusColor={gas.color}
          />
        </section>
      )}

      {/* Actuator + stats */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {latest && (
          <ActuatorCard
            fanOn={latest.fan_on}
            buzzerOn={latest.buzzer_on}
            ledRedOn={latest.led_red_on}
            ledGreenOn={latest.led_green_on}
          />
        )}
        <StatsPanel stats={stats} />
      </section>

      <TelemetryChart data={history} />

      {/* AI / ML Section */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-400">
          <span className="inline-block h-px flex-1 bg-slate-700/60" />
          <span>{"\uD83E\uDD16"} AI / Machine Learning</span>
          <span className="inline-block h-px flex-1 bg-slate-700/60" />
        </h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <MLClassificationCard data={mlLatest} />
          <MLPredictionCard predictions={mlPredictions} />
        </div>
      </section>

      {/* Log data real-time per bacaan */}
      <DataLog data={history} />

      <AlertTable alerts={alerts} />

      <footer className="pb-4 text-center text-[11px] text-slate-600">
        Smart Room IoT Monitoring · threshold gas 3500 / suhu 40°C / kelembapan 75% ·
        data dikirim ESP32 tiap 10 detik
      </footer>
    </main>
  );
}