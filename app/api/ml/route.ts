import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getThresholdSettings } from "@/lib/settings";
import { classifyReading, linearRegressionPrediction, predictNextValues } from "@/lib/ml";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") ?? "all";
    const result: Record<string, unknown> = { ok: true };
    const settings = getThresholdSettings();

    if (type === "all" || type === "classifications") {
      const classifications = db.prepare(
        "SELECT * FROM ml_classifications ORDER BY created_at DESC LIMIT 50"
      ).all();
      result.classifications = classifications;
    }
    if (type === "all" || type === "predictions") {
      const predictions = db.prepare(
        "SELECT * FROM ml_predictions ORDER BY created_at DESC LIMIT 100"
      ).all();
      result.predictions = predictions;
    }

    // In-app computation setiap request: klasifikasi + prediksi dari data terbaru
    const recent = db.prepare(
      "SELECT * FROM telemetry ORDER BY created_at DESC LIMIT 30"
    ).all() as {
      temperature: number | null;
      humidity: number | null;
      gas_value: number | null;
      created_at: string;
    }[];

    if (recent.length > 0) {
      const latest = recent[0];
      const cls = classifyReading(
        {
          temperature: latest.temperature ?? 0,
          humidity: latest.humidity ?? 0,
          gas_value: latest.gas_value ?? 0,
        },
        settings
      );
      result.live_classification = {
        status: cls.status,
        confidence: Math.round(cls.confidence * 100) / 100,
        reasons: cls.reasons,
        timestamp: new Date().toISOString(),
      };

      const nextPoint = predictNextValues(
        recent.map((r) => ({
          temperature: r.temperature,
          humidity: r.humidity,
          gas_value: r.gas_value,
        }))
      );
      result.live_prediction = nextPoint;

      const forecast = linearRegressionPrediction(recent, settings);
      result.live_forecast = forecast;
    } else {
      result.live_classification = null;
      result.live_prediction = null;
      result.live_forecast = null;
    }

    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}