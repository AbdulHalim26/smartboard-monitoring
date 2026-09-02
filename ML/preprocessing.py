"""
Preprocessing / Pembersihan Data — Smart Room ML
=================================================
Sebelum data masuk ke model (Decision Tree & ARIMA), data sensor dibersihkan
dulu dari anomali. Alur pembersihan:

  1. LOAD        — ambil data mentah dari Supabase (raw telemetry)
  2. SPIKE        — deteksi loncatan abnormal (IQR method), ganti dengan
                   nilai benar / nilai terakhir yang valid
  3. MISSING      — isi data yang hilang (gap) dengan INTERPOLASI LINEAR
  4. LABEL        — beri status NORMAL/WASPADA/BAHAYA (untuk training)
  5. CLEAN        — hasil akhir yang siap dipakai ML

Fungsi ini meniru preprocessing Node-RED pada repo teman
(fn_preprocess: detectSpike IQR + interpolasi linear), tapi ditulis ulang
untuk membaca/menulis Supabase.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import numpy as np
import pandas as pd

# Interval kirim ESP32 = 10 detik. Jika jeda > 60 detik dianggap 'gap'
# yang perlu diisi ionterpolasi; jika > 5 menit dianggap device mati (tidak diisi).
EXPECTED_INTERVAL_S = 10
MAX_GAP_S = 60
MAX_DEAD_S = 300
IQR_FACTOR = 1.5


def classify_status(temp: float, hum: float, gas: int) -> str:
    """Threshold rule-based — ground truth untuk training Decision Tree.
    Nilai dari EDA (EDA/output/threshold_recommendation.txt, data riil Supabase)."""
    if temp >= 36.0 or gas >= 2500:
        return "BAHAYA"
    if temp >= 33.0 or hum <= 30.0 or hum >= 75.0 or gas >= 1500:
        return "WASPADA"
    return "NORMAL"


def _detect_spike(series: pd.Series) -> pd.Series:
    """Deteksi anomali (spike) memakai metode IQR (Interquartile Range).
    Nilai di luar rentang [Q1-1.5*IQR, Q3+1.5*IQR] dianggap spike."""
    q1 = series.quantile(0.25)
    q3 = series.quantile(0.75)
    iqr = q3 - q1
    if iqr == 0:  # data cenderung konstan -> jangan hapus semua
        return pd.Series(False, index=series.index)
    lower = q1 - IQR_FACTOR * iqr
    upper = q3 + IQR_FACTOR * iqr
    return (series < lower) | (series > upper)


def remove_spikes(df: pd.DataFrame, cols: list[str]) -> pd.DataFrame:
    """Ganti nilai spike dengan nilai terakhir yang valid (forward-fill).
    Mengikuti logika Node-RED teman: jika terdeteksi spike, pakai nilai
    pembacaan sebelumnya, dan tandai sebagai SPIKE_REMOVED."""
    out = df.copy()
    for col in cols:
        spike = _detect_spike(out[col])
        if spike.any():
            # Buffering: hanya hapus spike jika bukan perubahan "besar yang bertahan"
            # (praktis: ganti spike dengan nilai sebelumnya yang valid).
            out.loc[spike, col] = np.nan
            out[col] = out[col].ffill()
        out[f"{col}_was_spike"] = spike.astype(int)
    return out


def interpolate_missing(df: pd.DataFrame, cols: list[str]) -> pd.DataFrame:
    """Isi data hilang (gap antar kiriman) pakai INTERPOLASI LINEAR.
    - Gap <= MAX_GAP_S   : isi dengan interpolasi linear (seperti teman)
    - Gap >  MAX_DEAD_S  : biarkan kosong (device mati, jangan dikarang)
    Tandai baris interpolasi dengan flag interpolated=1."""
    if df.empty:
        return df
    out = df.copy().sort_values("timestamp").reset_index(drop=True)
    out["interpolated"] = 0

    gaps = out["timestamp"].diff().dt.total_seconds()
    interpolate_idx = gaps.between(EXPECTED_INTERVAL_S + 1, MAX_DEAD_S)

    interpolate_idx = interpolate_idx.fillna(False).astype(bool)

    # Untuk baris yang akan diinterpolasi, set nilai NaN supaya nanti diinterpolasi.
    interp_rows = out.loc[interpolate_idx].index
    if len(interp_rows):
        for col in cols:
            out.loc[interp_rows, col] = np.nan

    for col in cols:
        if out[col].isna().any():
            out[col] = out[col].interpolate(method="linear", limit_direction="both")

    # Baris yang tadinya NaN kini terisi -> tandai interpolated
    out.loc[interp_rows, "interpolated"] = 1
    # Hapus sisa NaN yang tidak terisi (device mati / di awal-akhir data)
    out.dropna(subset=cols, inplace=True)
    out.reset_index(drop=True, inplace=True)
    return out


def label_status(df: pd.DataFrame) -> pd.DataFrame:
    """Beri kolom 'status' (NORMAL/WASPADA/BAHAYA) untuk training."""
    out = df.copy()
    out["status"] = out.apply(
        lambda r: classify_status(r["temperature"], r["humidity"], r["gas_value"]),
        axis=1,
    )
    return out


def preprocess(df: pd.DataFrame, cols: list[str] | None = None) -> pd.DataFrame:
    """Pipeline pembersihan data lengkap: spike -> interpolasi -> label."""
    if df is None or df.empty or "timestamp" not in df.columns:
        return df

    if cols is None:
        cols = [c for c in ["temperature", "humidity", "gas_value"] if c in df.columns]

    df = df.sort_values("timestamp").reset_index(drop=True)
    n_spike = 0
    n_interp = 0

    # 1. Buang spike
    before = len(df)
    df = remove_spikes(df, cols)
    if f"{cols[0]}_was_spike" in df.columns:
        n_spike = int(df[[f"{c}_was_spike" for c in cols]].sum().sum())
        df = df[[c for c in df.columns if not c.endswith("_was_spike")]]

    # 2. Interpolasi data hilang
    df = interpolate_missing(df, cols)
    n_interp = int(df["interpolated"].sum()) if "interpolated" in df.columns else 0

    # 3. Label status
    if all(c in df.columns for c in ["temperature", "humidity", "gas_value"]):
        df = label_status(df)

    n_removed = before - len(df)
    print(f"[Preprocess] {before} baris -> spike:{n_spike} interpolasi:{n_interp} "
          f"dibuang:{n_removed} -> {len(df)} baris bersih")
    return df
