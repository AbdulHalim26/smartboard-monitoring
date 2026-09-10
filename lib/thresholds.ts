export const THRESHOLDS = {
  GAS: 500,
  TEMP: 32.0,
  HUM: 75.0,
} as const;

export const GAS_LEVELS = {
  GOOD: 150,
  MODERATE: THRESHOLDS.GAS,
  POOR: THRESHOLDS.GAS,
} as const;

export type AlertType = "GAS" | "TEMP" | "HUM";

export type GasLevel = "GOOD" | "MODERATE" | "POOR" | "HAZARDOUS";

export interface ThresholdSettings {
  gas: number;
  temp: number;
  hum: number;
  autoControl: boolean;
}

export function getGasLevel(gas: number, threshold: number = THRESHOLDS.GAS): GasLevel {
  if (gas <= threshold * 0.5) return "GOOD";
  if (gas <= threshold) return "MODERATE";
  if (gas <= threshold * 1.15) return "POOR";
  return "HAZARDOUS";
}

export function getGasLabel(
  gas: number,
  threshold: number = THRESHOLDS.GAS
): { label: string; level: GasLevel } {
  const level = getGasLevel(gas, threshold);
  const labels: Record<GasLevel, string> = {
    GOOD: "Good",
    MODERATE: "Moderate",
    POOR: "Poor",
    HAZARDOUS: "Hazardous",
  };
  return { label: labels[level], level };
}

export function computeStatus(
  input: {
    gas_value: number;
    temperature: number;
    humidity: number;
  },
  thresholds: ThresholdSettings = {
    gas: THRESHOLDS.GAS,
    temp: THRESHOLDS.TEMP,
    hum: THRESHOLDS.HUM,
    autoControl: true,
  }
): { status: "NORMAL" | "ALERT"; reasons: AlertType[] } {
  const reasons: AlertType[] = [];
  if (input.gas_value > thresholds.gas) reasons.push("GAS");
  if (input.temperature > thresholds.temp) reasons.push("TEMP");
  if (input.humidity > thresholds.hum) reasons.push("HUM");
  return {
    status: reasons.length > 0 ? "ALERT" : "NORMAL",
    reasons,
  };
}