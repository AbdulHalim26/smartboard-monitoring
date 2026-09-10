"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  computeStatus,
  getGasLabel,
  THRESHOLDS,
  type AlertType,
  type ThresholdSettings,
} from "@/lib/thresholds";
import type { AlertRow, MLClassification, StatsResult, TelemetryRow } from "@/lib/types";
import { SensorCard } from "@/components/SensorCard";
import { StatusBanner } from "@/components/StatusBanner";
import { ActuatorCard } from "@/components/ActuatorCard";
import { ThresholdCard } from "@/components/ThresholdCard";
import { TelemetryChart } from "@/components/TelemetryChart";
import { AlertTable } from "@/components/AlertTable";
import { StatsPanel } from "@/components/StatsPanel";
import { DataLog } from "@/components/DataLog";
import { LiveClock } from "@/components/LiveClock";
import { LastSeen } from "@/components/LastSeen";
import { MLClassificationCard } from "@/components/MLClassificationCard";
import { MLPredictionCard, type LivePrediction } from "@/components/MLPredictionCard";

const DEFAULT_SETTINGS: ThresholdSettings = { gas: THRESHOLDS.GAS, temp: THRESHOLDS.TEMP, hum: THRESHOLDS.HUM, autoControl: true };

export default function DashboardPage() {
  const [latest, setLatest] = useState<TelemetryRow | null>(null);
  const [history, setHistory] = useState<TelemetryRow[]>([]);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [stats, setStats] = useState<StatsResult | null>(null);
  const [settings, setSettings] = useState<ThresholdSettings>(DEFAULT_SETTINGS);
  const [offline, setOffline] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [mlLatest, setMlLatest] = useState<MLClassification | null>(null);
  const [mlLive, setMlLive] = useState<LivePrediction | null>(null);
  const hasDataRef = useRef(false);

  const hydrate = useCallback((row: TelemetryRow) => {
    hasDataRef.current = true;
    setLatest(row);
    setLastUpdate(Date.now());
    setHistory((prev) => {
      const next = [row, ...prev.filter((r) => r.id !== row.id)];
      return next.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });
  }, []);

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
      } else if (!json.data && !hasDataRef.current) {
        // belum ada data — bukan error, dashboard menunggu sensor
        setFetchError(null);
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
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )
        );
        setFetchError(null);
      } else {
        setFetchError(`/api/telemetry: ${json.error ?? "response tidak ok"}`);
      }
    } catch (err) {
      setFetchError(`/api/telemetry gagal: ${(err as Error).message}`);
    }
  }, []);

  const refreshSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/settings", { cache: "no-store" });
      const json = await res.json();
      if (json.ok && json.settings) {
        setSettings({
          gas: json.settings.gas,
          temp: json.settings.temp,
          hum: json.settings.hum,
          autoControl: json.settings.autoControl,
        });
      }
    } catch {
      // pakai default bila gagal
    }
  }, []);

  const handleSettingsSave = useCallback(async (s: ThresholdSettings) => {
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(s),
      });
      const json = await res.json();
      if (json.ok) {
        setSettings(json.settings);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const refreshML = useCallback(async () => {
    try {
      const res = await fetch("/api/ml?limit=5", { cache: "no-store" });
      const json = await res.json();
      if (json.ok) {
        const cls = json.classifications as MLClassification[];
        if (cls.length) setMlLatest(cls[0]);
        if (json.live_prediction) setMlLive(json.live_prediction as LivePrediction);
        if (json.live_classification && cls.length === 0) {
          setMlLatest({
            id: 0,
            timestamp: json.live_classification.timestamp,
            temperature: json.live_classification.temperature ?? null,
            humidity: json.live_classification.humidity ?? null,
            gas_value: json.live_classification.gas_value ?? null,
            predicted_status: json.live_classification.status,
            confidence: json.live_classification.confidence,
            created_at: new Date().toISOString(),
          } as MLClassification);
        }
      }
    } catch {
      // ML backend optional — silent fail
    }
  }, []);

  const refreshAll = useCallback(() => {
    refreshLatest();
    refreshHistory();
    refreshAlerts();
    refreshStats();
    refreshSettings();
    refreshML();
  }, [refreshLatest, refreshHistory, refreshAlerts, refreshStats, refreshSettings, refreshML]);

  useEffect(() => {
    const initialLoadTimer = setTimeout(refreshAll, 0);
    const pollTimer = setInterval(() => {
      refreshLatest();
      refreshAlerts();
      refreshStats();
      refreshSettings();
      refreshML();
    }, 5000);
    const cycleTimer = setInterval(refreshAll, 30_000);
    return () => {
      clearTimeout(initialLoadTimer);
      clearInterval(pollTimer);
      clearInterval(cycleTimer);
    };
  }, [refreshAll, refreshLatest, refreshAlerts, refreshStats, refreshSettings, refreshML]);

  useEffect(() => {
    const offlineTimer = setInterval(() => {
      if (lastUpdate && Date.now() - lastUpdate > 30_000) setOffline(true);
    }, 1000);
    return () => clearInterval(offlineTimer);
  }, [lastUpdate]);

  const handleActuatorToggle = useCallback(
    async (command: string, on: boolean) => {
      try {
        const res = await fetch("/api/actuator", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            device_id: latest?.device_id ?? "esp32-room-01",
            command,
            payload: on ? "1" : "0",
          }),
        });
        const json = await res.json();
        if (json.ok) return true;
        setFetchError(`/api/actuator: ${json.error ?? "gagal"}`);
        return false;
      } catch (err) {
        setFetchError(`/api/actuator gagal: ${(err as Error).message}`);
        return false;
      }
    },
    [latest]
  );

  const status = latest
    ? computeStatus(
        {
          gas_value: latest.gas_value ?? 0,
          temperature: latest.temperature ?? 0,
          humidity: latest.humidity ?? 0,
        },
        settings
      )
    : { status: "NORMAL" as const, reasons: [] as AlertType[] };

  const gas = latest ? getGasLabel(latest.gas_value ?? 0, settings.gas) : null;
  const timeFmt = (t: number) =>
    new Date(t).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-5 px-4 py-6 sm:px-6">
      {fetchError && (
        <div className="flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          <span className="mt-0.5">{"\u26A0\uFE0F"}</span>
          <span>
            <b>Fetch error:</b> {fetchError}
          </span>
        </div>
      )}

      {!latest && !fetchError && (
        <div className="flex items-center gap-3 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-6 text-sm text-sky-200">
          <span className="relative flex h-3 w-3">
            <span className="absolute h-full w-full animate-ping rounded-full bg-sky-400 opacity-60" />
            <span className="relative h-3 w-3 rounded-full bg-sky-400" />
          </span>
          <div>
            <b>Menunggu data sensor...</b> Dashboard otomatis menampilkan data begitu ESP32
            mengirim bacaan pertama. Pastikan ESP32 terhubung ke jaringan WiFi yang sama dan
            server ini bisa diakses dari ESP32.
          </div>
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
        <div className="flex flex-wrap items-center gap-3">
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
        <section className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,15rem),1fr))] gap-4">
          <SensorCard
            title="Suhu"
            icon="\uD83C\uDF21\uFE0F"
            accent="temp"
            value={latest.temperature != null ? latest.temperature.toFixed(1) : "--"}
            unit="°C"
            statusColor={
              latest.temperature != null && latest.temperature > settings.temp ? "red" : "default"
            }
          />
          <SensorCard
            title="Kelembapan"
            icon="\uD83D\uDCA7"
            accent="hum"
            value={latest.humidity != null ? latest.humidity.toFixed(0) : "--"}
            unit="%RH"
            statusColor={
              latest.humidity != null && latest.humidity > settings.hum ? "red" : "default"
            }
          />
          <SensorCard
            title="Gas / Asap"
            icon="\uD83C\uDF2B\uFE0F"
            accent="gas"
            value={latest.gas_value ?? "--"}
            unit="ADC"
            statusColor={gas ? gasLevelColor(gas.level) : "default"}
          />
        </section>
      )}

      {/* Actuator + kalibrasi + stats */}
      <section className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,17rem),1fr))] gap-4">
        {latest && (
          <ActuatorCard
            fanOn={latest.fan_on}
            buzzerOn={latest.buzzer_on}
            ledRedOn={latest.led_red_on}
            ledGreenOn={latest.led_green_on}
            gasThreshold={settings.gas}
            onToggle={handleActuatorToggle}
          />
        )}
        <ThresholdCard
          settings={settings}
          current={
            latest
              ? {
                  temperature: latest.temperature,
                  humidity: latest.humidity,
                  gas_value: latest.gas_value,
                }
              : null
          }
          onSave={handleSettingsSave}
        />
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <MLClassificationCard data={mlLatest} />
          <MLPredictionCard live={mlLive} />
        </div>
      </section>

      {/* Log data real-time per bacaan */}
      <DataLog data={history} />
      <AlertTable alerts={alerts} />

      <footer className="hud-note pb-4 text-center">
        Smart Room IoT Monitoring · threshold gas {settings.gas} / suhu {settings.temp}°C /
        kelembapan {settings.hum}% · auto-kontrol {settings.autoControl ? "AKTIF" : "mati"} ·
        data dikirim ESP32 tiap 10 detik
      </footer>
    </main>
  );
}

function gasLevelColor(level: "GOOD" | "MODERATE" | "POOR" | "HAZARDOUS") {
  switch (level) {
    case "GOOD":
      return "green" as const;
    case "MODERATE":
    case "POOR":
      return "yellow" as const;
    case "HAZARDOUS":
      return "red" as const;
  }
}