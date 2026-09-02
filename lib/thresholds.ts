export const THRESHOLDS = {
  GAS: 3500,
  TEMP: 40.0,
  HUM: 75.0,
} as const;

export type AlertType = "GAS" | "TEMP" | "HUM";

export function computeStatus(input: {
  gas_value: number;
  temperature: number;
  humidity: number;
}): { status: "NORMAL" | "ALERT"; reasons: AlertType[] } {
  const reasons: AlertType[] = [];
  if (input.gas_value > THRESHOLDS.GAS) reasons.push("GAS");
  if (input.temperature > THRESHOLDS.TEMP) reasons.push("TEMP");
  if (input.humidity > THRESHOLDS.HUM) reasons.push("HUM");
  return {
    status: reasons.length > 0 ? "ALERT" : "NORMAL",
    reasons,
  };
}
