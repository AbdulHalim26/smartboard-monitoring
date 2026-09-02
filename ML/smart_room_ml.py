"""
Smart Room ML — Decision Tree classifier + ARIMA trend prediction
Backend Python yang membaca dari Supabase (telemetry) dan menulis hasil
klasifikasi + prediksi ke tabel ml_classifications & ml_predictions.

Jalankan: python smart_room_ml.py  (otomatis loop tiap 60 detik)
"""

from __future__ import annotations

import os
import sys
import time
import json
import warnings
from datetime import datetime, timedelta, timezone
from pathlib import Path

import numpy as np
import pandas as pd
import requests
from joblib import dump, load
from sklearn.tree import DecisionTreeClassifier
from statsmodels.tsa.arima.model import ARIMA

from preprocessing import preprocess, remove_spikes, classify_status

warnings.filterwarnings("ignore")

# ─── Config ─────────────────────────────────────────────────────────────
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://mdkzgerpvdduheqqfsvx.supabase.co")
SUPABASE_ANON_KEY = os.getenv(
    "SUPABASE_ANON_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ka3pnZXJwdmRkdWhlcXFmc3Z4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyNzQ5NDAsImV4cCI6MjEwMzg1MDk0MH0.9IUEM0Hw45b12lEB9oL_JbtQxQ9dZgCNj6FhJr9k_Rg",
)
POLL_INTERVAL = 60  # detik
MODEL_DIR = Path(__file__).parent / "saved_models"
MODEL_DIR.mkdir(exist_ok=True)

REST = f"{SUPABASE_URL}/rest/v1"
HEADERS = {
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}


# ─── Supabase helpers ───────────────────────────────────────────────────
def sb_select(table: str, query: str = "", count: bool = False) -> list[dict]:
    url = f"{REST}/{table}?{requests.utils.quote(query, safe='=&.,%')}"
    h = {**HEADERS, "Prefer": "count=exact"} if count else HEADERS
    r = requests.get(url, headers=h, timeout=15)
    r.raise_for_status()
    return r.json()


def sb_insert(table: str, rows: list[dict]):
    url = f"{REST}/{table}"
    r = requests.post(url, headers=HEADERS, json=rows, timeout=15)
    r.raise_for_status()


# ─── Data loading ────────────────────────────────────────────────────────
def load_recent(hours: int = 4) -> pd.DataFrame:
    """Ambil data telemetry dari Supabase (terakhir N jam)."""
    since = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()
    rows = sb_select(
        "telemetry",
        f"select=created_at,temperature,humidity,gas_value&"
        f"created_at=gte.{since}&order=created_at.asc&limit=1500",
    )
    if not rows:
        return pd.DataFrame()
    df = pd.DataFrame(rows)
    df.rename(columns={"created_at": "timestamp"}, inplace=True)
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df["temperature"] = pd.to_numeric(df["temperature"], errors="coerce")
    df["humidity"] = pd.to_numeric(df["humidity"], errors="coerce")
    df["gas_value"] = pd.to_numeric(df["gas_value"], errors="coerce")
    df.dropna(subset=["temperature", "humidity", "gas_value"], inplace=True)
    return df


def load_latest() -> dict | None:
    rows = sb_select("telemetry", "order=created_at.desc&limit=1")
    return rows[0] if rows else None


# ─── Feature engineering ─────────────────────────────────────────────────
def compute_features(df: pd.DataFrame) -> pd.DataFrame:
    """Tambah statistik rolling agar Decision Tree lebih akurat."""
    out = df.copy()
    for col in ["temperature", "humidity", "gas_value"]:
        out[f"{col}_mean10"] = out[col].rolling(10, min_periods=1).mean()
        out[f"{col}_std10"] = out[col].rolling(10, min_periods=1).std().fillna(0)
        out[f"{col}_delta"] = out[col].diff().fillna(0)
    out["hour"] = out["timestamp"].dt.hour
    return out


# ─── Decision Tree ───────────────────────────────────────────────────────
FEATURE_COLS = [
    "temperature", "humidity", "gas_value",
    "temperature_mean10", "temperature_std10", "temperature_delta",
    "humidity_mean10", "humidity_std10", "humidity_delta",
    "gas_value_mean10", "gas_value_std10", "gas_value_delta",
    "hour",
]


def train_classifier(df: pd.DataFrame) -> DecisionTreeClassifier:
    # df SUDAH dibersihkan (preprocess) sebelum dipanggil.
    df = compute_features(df)
    clf = DecisionTreeClassifier(max_depth=6, random_state=42)
    clf.fit(df[FEATURE_COLS], df["status"])
    dump(clf, MODEL_DIR / "dt_classifier.joblib")
    return clf


def predict_class(clf: DecisionTreeClassifier, latest_row: dict) -> tuple[str, float]:
    """Prediksi status + confidence untuk baris terbaru."""
    df = pd.DataFrame([latest_row])
    df["timestamp"] = pd.Timestamp.now()  # feature 'hour' butuh kolom timestamp
    df = compute_features(df)
    proba = clf.predict_proba(df[FEATURE_COLS])[0]
    classes = clf.classes_
    idx = int(np.argmax(proba))
    return classes[idx], float(proba[idx])


# ─── ARIMA ───────────────────────────────────────────────────────────────
def arima_forecast(series: pd.Series, steps: int = 3) -> list[float]:
    """Prediksi N jam ke depan (assuming data tiap ~10 detik → steps in jam)."""
    if len(series) < 10:
        return []
    # Resample ke rata-rata per jam agar ARIMA stabil
    hourly = series.resample("1h").mean().dropna()
    if len(hourly) < 3:
        return []
    try:
        model = ARIMA(hourly.values, order=(1, 1, 1))
        fitted = model.fit()
        return fitted.forecast(steps=steps).tolist()
    except Exception:
        return []


# ─── Main loop ───────────────────────────────────────────────────────────
def run_once():
    latest = load_latest()
    if not latest:
        print("[ML] Tidak ada data telemetry, skip.")
        return

    df = load_recent(hours=24)
    if len(df) < 10:
        print(f"[ML] Data terlalu sedikit ({len(df)} baris), skip training.")
        return

    # 0) PREPROCESSING: buang spike + interpolasi data hilang
    df_clean = preprocess(df)

    # 1) Train classifier (pakai data yang sudah dibersihkan)
    clf = train_classifier(df_clean)

    # 2) Prediksi status dari baris TERBARU
    #    Cek dulu apakah baris terbaru itu spike (anomali) — jika ya, jangan
    #    langsung dipercaya untuk klasifikasi.
    temp = float(latest.get("temperature") or 0)
    hum = float(latest.get("humidity") or 0)
    gas = int(latest.get("gas_value") or 0)

    latest_df = pd.DataFrame([{
        "timestamp": pd.Timestamp.now(),
        "temperature": temp, "humidity": hum, "gas_value": gas,
    }])
    latest_clean = remove_spikes(latest_df, ["temperature", "humidity", "gas_value"])
    spike_flag = int(latest_clean[f"temperature_was_spike"].sum() +
                     latest_clean[f"humidity_was_spike"].sum() +
                     latest_clean[f"gas_value_was_spike"].sum()) > 0

    status, confidence = predict_class(clf, {
        "temperature": float(latest_clean["temperature"].iloc[0]),
        "humidity": float(latest_clean["humidity"].iloc[0]),
        "gas_value": int(latest_clean["gas_value"].iloc[0]),
    })

    ts_now = datetime.now(timezone.utc).isoformat()
    row_data = {
        "timestamp": ts_now,
        "temperature": temp,
        "humidity": hum,
        "gas_value": gas,
        "predicted_status": status,
        "confidence": round(confidence, 4),
    }
    try:
        row_data["spike_removed"] = spike_flag
        sb_insert("ml_classifications", [row_data])
    except Exception:
        # tabel belum punya kolom spike_removed — retry tanpa kolom itu
        row_data.pop("spike_removed", None)
        sb_insert("ml_classifications", [row_data])
    print(f"[ML] Klasifikasi: {status} ({confidence:.2%})" +
          (" — catatan: baris terbaru dideteksi spike & diganti" if spike_flag else ""))

    # 3) ARIMA prediksi (pakai data bersih)
    df_features = compute_features(df_clean)
    preds = []
    for col, col_name in [("temperature", "temperature"), ("humidity", "humidity"), ("gas_value", "gas_value")]:
        forecast = arima_forecast(df_features.set_index("timestamp")[col])
        for h, val in enumerate(forecast, start=1):
            target_ts = (datetime.now(timezone.utc) + timedelta(hours=h)).isoformat()
            preds.append({
                "timestamp": ts_now,
                "target_timestamp": target_ts,
                "column_name": col_name,
                "predicted_value": round(float(val), 2),
                "model_type": "ARIMA",
            })

    if preds:
        sb_insert("ml_predictions", preds)
        print(f"[ML] {len(preds)} prediksi ARIMA ditulis ke Supabase.")


def main():
    print("Smart Room ML — running")
    while True:
        try:
            run_once()
        except Exception as e:
            print(f"[ML] Error: {e}", file=sys.stderr)
        time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    main()
