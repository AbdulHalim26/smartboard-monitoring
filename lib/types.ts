import type { AlertType } from "./thresholds";

export type DeviceStatus = "NORMAL" | "ALERT";

export interface TelemetryRow {
  id: number;
  device_id: string;
  temperature: number | null;
  humidity: number | null;
  gas_value: number | null;
  status: DeviceStatus;
  fan_on: boolean;
  buzzer_on: boolean;
  led_red_on: boolean;
  led_green_on: boolean;
  created_at: string;
}

export interface AlertRow {
  id: number;
  telemetry_id: number | null;
  device_id: string;
  alert_type: AlertType;
  message: string;
  value: number | null;
  threshold: number | null;
  created_at: string;
}

export interface StatsResult {
  avg_temp: number;
  min_temp: number;
  max_temp: number;
  avg_hum: number;
  min_hum: number;
  max_hum: number;
  avg_gas: number;
  max_gas: number;
  alert_count: number;
}

export type MLPredictedStatus = "NORMAL" | "WASPADA" | "BAHAYA";

export interface MLClassification {
  id: number;
  timestamp: string;
  temperature: number | null;
  humidity: number | null;
  gas_value: number | null;
  predicted_status: MLPredictedStatus;
  confidence: number;
  created_at: string;
}

export interface MLPrediction {
  id: number;
  timestamp: string;
  target_timestamp: string;
  column_name: "temperature" | "humidity" | "gas_value";
  predicted_value: number;
  model_type: string;
  created_at: string;
}
