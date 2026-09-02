"""
EDA — Smart Room Monitoring (berbasis Data Riil Supabase)
=========================================================
Analisis data telemetry yang sudah terkumpul di Supabase untuk
menentukan threshold NORMAL/WASPADA/BAHAYA yang valid (bukan placeholder).

Menghasilkan:
  - output/*.png  (plot statistik)
  - threshold_recommendation.txt (threshold final + alasan)

Jalankan:  .venv/bin/python eda.py
(sesuaikan path venv jika perlu:  python eda.py)
"""

import json
import sys
from datetime import datetime
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

HERE = Path(__file__).parent
OUT = HERE / "output"
OUT.mkdir(exist_ok=True)

RAW = Path("/tmp/telemetry_raw.json")


def load_data() -> pd.DataFrame:
    if not RAW.exists():
        sys.exit(f"File data tidak ditemukan: {RAW}\n"
                 "Pull dulu: curl .../rest/v1/telemetry > /tmp/telemetry_raw.json")
    with open(RAW) as f:
        rows = json.load(f)
    df = pd.DataFrame(rows)
    df["timestamp"] = pd.to_datetime(df["created_at"])
    df["temperature"] = pd.to_numeric(df["temperature"], errors="coerce")
    df["humidity"] = pd.to_numeric(df["humidity"], errors="coerce")
    df["gas_value"] = pd.to_numeric(df["gas_value"], errors="coerce")
    return df.dropna(subset=["temperature", "humidity", "gas_value"])


def describe(df: pd.DataFrame, col: str) -> dict:
    s = df[col]
    q = s.quantile([0.05, 0.25, 0.5, 0.75, 0.95])
    return {
        "min": round(float(s.min()), 2),
        "p05": round(float(q[0.05]), 2),
        "p25": round(float(q[0.25]), 2),
        "median": round(float(s.median()), 2),
        "p75": round(float(q[0.75]), 2),
        "p95": round(float(q[0.95]), 2),
        "max": round(float(s.max()), 2),
        "mean": round(float(s.mean()), 2),
        "std": round(float(s.std()), 2),
    }


def main():
    df = load_data()
    print(f"Jumlah baris: {len(df)}")
    print(f"Rentang waktu: {df['timestamp'].min()} s/d {df['timestamp'].max()}\n")

    # ---------- 1. Statistik deskriptif ----------
    print("=" * 60)
    print("STATISTIK DESKRIPTIF PER SENSOR")
    print("=" * 60)
    stats = {}
    for col in ["temperature", "humidity", "gas_value"]:
        stats[col] = describe(df, col)
        d = stats[col]
        print(f"\n{col.upper()}:")
        print(f"  min={d['min']} p5={d['p05']} p25={d['p25']} median={d['median']} "
              f"p75={d['p75']} p95={d['p95']} max={d['max']}")
        print(f"  mean={d['mean']} ± std={d['std']}")

    # ---------- 2. Boxplot ----------
    fig, axes = plt.subplots(1, 3, figsize=(16, 5))
    titles = {"temperature": "Temperature (°C)", "humidity": "Humidity (%)",
              "gas_value": "Gas (ADC)"}
    for ax, col in zip(axes, titles):
        ax.boxplot(df[col], vert=False)
        ax.set_title(f"Boxplot {titles[col]}")
        ax.set_xlabel(titles[col])
        ax.grid(axis="x", alpha=0.3)
    fig.suptitle("Distribusi Data Sensor (Data Riil)", fontsize=13)
    fig.tight_layout()
    fig.savefig(OUT / "boxplot_all.png", dpi=110)
    plt.close(fig)
    print("\n[✓] boxplot_all.png")

    # ---------- 3. Histogram per sensor ----------
    fig, axes = plt.subplots(1, 3, figsize=(16, 4))
    for ax, col in zip(axes, titles):
        ax.hist(df[col], bins=30, color="#4f8cf7", alpha=0.7, edgecolor="white")
        ax.set_title(titles[col])
        ax.grid(axis="y", alpha=0.3)
    fig.tight_layout()
    fig.savefig(OUT / "histogram_all.png", dpi=110)
    plt.close(fig)
    print("[✓] histogram_all.png")

    # ---------- 4. Tren time series ----------
    fig, axes = plt.subplots(3, 1, figsize=(14, 10), sharex=True)
    for ax, col in zip(axes, ["temperature", "humidity", "gas_value"]):
        ax.plot(df["timestamp"], df[col], lw=0.8, color="#4f8cf7")
        ax.set_ylabel(titles[col])
        ax.grid(alpha=0.3)
    axes[0].set_title("Tren Data Sensor dari Waktu ke Waktu")
    fig.tight_layout()
    fig.savefig(OUT / "trend_all.png", dpi=110)
    plt.close(fig)
    print("[✓] trend_all.png")

    # ---------- 5. Korelasi ----------
    corr = df[["temperature", "humidity", "gas_value"]].corr()
    print("\n" + "=" * 60)
    print("MATRIKS KORELASI")
    print("=" * 60)
    print(corr.round(3))

    fig, ax = plt.subplots(figsize=(6, 5))
    im = ax.imshow(corr.values, cmap="coolwarm", vmin=-1, vmax=1)
    ax.set_xticks(range(3))
    ax.set_yticks(range(3))
    ax.set_xticklabels(["temp", "hum", "gas"])
    ax.set_yticklabels(["temp", "hum", "gas"])
    for i in range(3):
        for j in range(3):
            ax.text(j, i, f"{corr.values[i, j]:.2f}", ha="center",
                    va="center", color="white")
    ax.set_title("Correlation Matrix")
    fig.colorbar(im)
    fig.tight_layout()
    fig.savefig(OUT / "correlation.png", dpi=110)
    plt.close(fig)
    print("[✓] correlation.png")

    # ---------- 6. Rekomendasi threshold ----------
    print("\n" + "=" * 60)
    print("REKOMENDASI THRESHOLD (data riil + referensi kesehatan)")
    print("=" * 60)

    # --- SUHU ---
    # Data riil: mean 31.73, p95 32.8, max 33.8. Ruangan kamu normal di 31-33°C.
    # WASPADA: saat suhu mulai di atas rentang nyaman ruangan (data p95) → 33.0
    # BAHAYA : suhu yang jelas tidak sehat/hangat ekstrem → 36.0 (referensi ASHRAE)
    temp_w = 33.0
    temp_b = 36.0

    # --- HUMIDITAS ---
    # Data riil: 59-76%, normal. Rendah (<30) & tinggi (>80) sama-sama tidak ideal.
    # Pakai referensi kenyamanan (30–70 nyaman), sesuaikan tinggi dgn data (76 max).
    hum_low = 30.0            # jangan ikuti data p05 (59) — itu salah
    hum_high = 75.0           # data max 76, jadi batas waspada 75 wajar

    # --- GAS (MQ-135 ADC) ---
    # Data riil hampir semua <150 ADC (udara sangat bersih) → data tak cukup
    # untuk kalibrasi batas atas. Pakai referensi kelayakan udara ruangan.
    # MQ-135 mentah: 1000-1500 = udara bersih, >2000 mulai polusi.
    gas_w = 1500
    gas_b = 2500

    rec = {
        "TEMP_WASPADA": temp_w,
        "TEMP_BAHAYA": temp_b,
        "HUM_WASPADA_LOW": hum_low,
        "HUM_WASPADA_HIGH": hum_high,
        "GAS_WASPADA": gas_w,
        "GAS_BAHAYA": gas_b,
    }

    for k, v in rec.items():
        print(f"  {k} = {v}")

    # Simpan rekomendasi
    t = datetime.now().strftime("%Y-%m-%d %H:%M")
    summary = (
        f"# Threshold Recommendation — Data Riil Supabase\n"
        f"Tanggal: {t} | Baris data: {len(df)}\n\n"
        f"## Statistik deskriptif\n"
        f"Temp: mean={stats['temperature']['mean']}±{stats['temperature']['std']} "
        f"(p5={stats['temperature']['p05']} p95={stats['temperature']['p95']} "
        f"max={stats['temperature']['max']})\n"
        f"Hum : mean={stats['humidity']['mean']}±{stats['humidity']['std']} "
        f"(min={stats['humidity']['min']} max={stats['humidity']['max']})\n"
        f"Gas : mean={stats['gas_value']['mean']:.0f}±{stats['gas_value']['std']:.0f} "
        f"(max={stats['gas_value']['max']})\n\n"
        f"## Korelasi\n{corr.round(3).to_string()}\n\n"
        f"## Threshold final (hasil EDA: data riil + referensi kesehatan)\n"
    )
    for k, v in rec.items():
        summary += f"  {k} = {v}\n"
    summary += (
        f"\nALASAN:\n"
        f"- SUHU WASPADA={temp_w}: data normal kamu 31-33°C, jadi WASPADA mulai 33°C "
        f"(bukan 30 placeholder yang terlalu agresif). BAHAYA=36°C (referensi hangat ekstrem).\n"
        f"- HUMIDITAS LOW=30% (referensi kenyamanan; data kamu tak pernah <59% jadi 30 "
        f"tidak bisa diturunkan dari data). HIGH=75% mendekati data max 76%.\n"
        f"- GAS WASPADA=1500/BAHAYA=2500 (referensi MQ-135; data kamu sangat bersih <150, "
        f"tak cukup untuk kalibrasi batas atas).\n"
        f"- KORELASI temp vs hum = {corr.values[0,1]:.2f}: sangat negatif (makin panas "
        f"makin kering), wajar.\n"
    )
    (OUT / "threshold_recommendation.txt").write_text(summary)
    print("\n[✓] threshold_recommendation.txt")
    print("[✓] Semua analisis selesai. Lihat folder EDA/output/")


if __name__ == "__main__":
    main()
