import type { MLClassification, MLPredictedStatus } from "@/lib/types";
import { THRESHOLDS, type ThresholdSettings } from "@/lib/thresholds";

export function classifyReading(
  input: {
    temperature: number;
    humidity: number;
    gas_value: number;
  },
  thresholds: ThresholdSettings = {
    gas: THRESHOLDS.GAS,
    temp: THRESHOLDS.TEMP,
    hum: THRESHOLDS.HUM,
    autoControl: true,
  }
): { status: MLPredictedStatus; confidence: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  if (input.temperature > thresholds.temp * 1.15) {
    score += 2;
    reasons.push(`suhu > ${(thresholds.temp * 1.15).toFixed(1)}°C`);
  } else if (input.temperature > thresholds.temp) {
    score += 1;
    reasons.push(`suhu > ${thresholds.temp.toFixed(1)}°C`);
  }

  if (input.humidity > thresholds.hum * 1.05) {
    score += 2;
    reasons.push(`kelembapan > ${(thresholds.hum * 1.05).toFixed(1)}%`);
  } else if (input.humidity > thresholds.hum) {
    score += 1;
    reasons.push(`kelembapan > ${thresholds.hum.toFixed(1)}%`);
  }

  if (input.gas_value > thresholds.gas * 1.3) {
    score += 3;
    reasons.push(`gas > ${Math.round(thresholds.gas * 1.3)} ADC`);
  } else if (input.gas_value > thresholds.gas * 1.15) {
    score += 2;
    reasons.push(`gas > ${Math.round(thresholds.gas * 1.15)} ADC`);
  } else if (input.gas_value > thresholds.gas) {
    score += 1;
    reasons.push(`gas > ${thresholds.gas} ADC`);
  }

  const status: MLPredictedStatus =
    score >= 4 ? "BAHAYA" : score >= 2 ? "WASPADA" : "NORMAL";

  const confidence = Math.min(0.99, 0.55 + score * 0.11);

  return { status, confidence, reasons };
}

export function predictNextValues(rows: {
  temperature: number | null;
  humidity: number | null;
  gas_value: number | null;
}[]): {
  temperature: number;
  humidity: number;
  gas_value: number;
} {
  const values = {
    temperature: rows.map((r) => r.temperature).filter((v): v is number => typeof v === "number"),
    humidity: rows.map((r) => r.humidity).filter((v): v is number => typeof v === "number"),
    gas_value: rows.map((r) => r.gas_value).filter((v): v is number => typeof v === "number"),
  };

  const predict = (arr: number[]) => {
    if (arr.length === 0) return 0;
    if (arr.length < 3) {
      return Math.round(arr[arr.length - 1] * 10) / 10;
    }
    const lastN = arr.slice(-5);
    const n = lastN.length;
    const xMean = (n - 1) / 2;
    const yMean = lastN.reduce((a, b) => a + b, 0) / n;
    const slope =
      lastN.reduce((acc, v, i) => acc + (i - xMean) * (v - yMean), 0) /
      lastN.reduce((acc, _, i) => acc + (i - xMean) ** 2, 0);
    const nextX = n;
    const y = yMean + slope * (nextX - xMean);
    return Math.max(0, Math.round(y * 10) / 10);
  };

  return {
    temperature: Math.max(0, Math.round(predict(values.temperature) * 10) / 10),
    humidity: Math.max(0, Math.min(100, Math.round(predict(values.humidity) * 10) / 10)),
    gas_value: Math.max(0, Math.round(predict(values.gas_value))),
  };
}

export function linearRegressionPrediction(
  rows: {
    created_at: string;
    temperature: number | null;
    humidity: number | null;
    gas_value: number | null;
  }[],
  thresholds: ThresholdSettings = {
    gas: THRESHOLDS.GAS,
    temp: THRESHOLDS.TEMP,
    hum: THRESHOLDS.HUM,
    autoControl: true,
  }
): MLClassification | null {
  if (rows.length === 0) return null;
  const latest = rows[0];
  const history = rows.slice(0, 30);

const inputs = history.map((r) => ({
    temperature: r.temperature ?? 0,
    humidity: r.humidity ?? 0,
    gas_value: r.gas_value ?? 0,
  }));

  // Data DESC (terbaru di index 0). Buat sumbu waktu naik ke masa depan:
  // x = n-1-i sehingga index 0 (terbaru) punya x terbesar.
  const n = history.length;
  const indexArr = Array.from({ length: n }, (_, i) => n - 1 - i);

  const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  const slope = (arr: number[]) => {
    const xMean = avg(indexArr);
    const yMean = avg(arr);
    const num = arr.reduce((acc, y, i) => acc + (indexArr[i] - xMean) * (y - yMean), 0);
    const den = indexArr.reduce((acc, x) => acc + (x - xMean) ** 2, 0);
    return den === 0 ? 0 : num / den;
  };

  const tempSlope = slope(inputs.map((x) => x.temperature));
  const humSlope = slope(inputs.map((x) => x.humidity));
  const gasSlope = slope(inputs.map((x) => x.gas_value));

  // Proyeksi 5 menit ke depan: per step ~10 detik -> 30 step
  const stepsAhead = 30;
  const predTemp = Math.max(0, latest.temperature! + tempSlope * stepsAhead);
  const predHum = Math.max(0, Math.min(100, latest.humidity! + humSlope * stepsAhead));
  const predGas = Math.max(0, latest.gas_value! + gasSlope * stepsAhead);

  const { status, confidence } = classifyReading(
    {
      temperature: predTemp,
      humidity: predHum,
      gas_value: predGas,
    },
    thresholds
  );

  return {
    id: 0,
    timestamp: new Date(new Date(latest.created_at).getTime() + 5 * 60 * 1000).toISOString(),
    temperature: predTemp,
    humidity: predHum,
    gas_value: predGas,
    predicted_status: status,
    confidence,
    created_at: new Date().toISOString(),
  };
}