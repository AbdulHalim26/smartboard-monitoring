# Smart Room Monitoring Dashboard

Dashboard monitoring ruangan real-time berbasis IoT. ESP32 membaca sensor DHT11 (suhu & kelembapan) dan MQ-135 (kualitas udara / asap), mengendalikan aktuator (LED merah/hijau, buzzer, relay fan), lalu mengirim data via WiFi (HTTP POST JSON) ke server Next.js yang menyimpannya ke **SQLite** lokal dan menampilkannya di dashboard web real-time.

## Teknologi

- **Framework**: Next.js 16 (App Router, TypeScript)
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Database**: SQLite (`better-sqlite3`) — file `data/smartroom.db`
- **Validasi**: Zod
- **Firmware**: Arduino IDE (WiFi.h + HTTPClient + ArduinoJson)

## Cara Menjalankan

```bash
npm install
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

> Database SQLite dibuat otomatis saat server pertama kali berjalan (`data/smartroom.db`).
> Tidak perlu setup cloud apa pun.

### Env

Buat `.env.local` dari `cp .env.local.example .env.local`:

```
IOT_API_KEY=rahasia-untuk-esp32
```

`IOT_API_KEY` dipakai ESP32 (header `x-api-key`) saat POST telemetry. Gunakan nilai yang
sama persis dengan `API_KEY` di firmware Arduino.

## Kontrol Aktuator dari Dashboard

1. Pada dashboard, klik toggle **Fan / Buzzer / LED** untuk ON/OFF.
2. Dashboard mengirim perintah ke `POST /api/actuator` → tersimpan di tabel `device_commands`.
3. ESP32 melakukan polling `GET /api/actuator?device_id=esp32-room-01` tiap 15 detik,
   mengeksekusi perintah, lalu melaporkan ACK (`PATCH /api/actuator`).

### Perintah yang didukung

`fan_on` · `fan_off` · `buzzer_on` · `buzzer_off` · `led_red_on` · `led_red_off` · `led_green_on` · `led_green_off` · `all_on` · `all_off` · `auto` · `autocloud`

## Threshold Gas / Asap (MQ-135)

Level dibedakan berdasarkan `lib/thresholds.ts`:

| Level | ADC | Aksi |
|-------|-----|------|
| GOOD | ≤ 1500 | Normal, LED hijau |
| MODERATE | 1501–3000 | Warning (sensor card kuning) |
| POOR (WASPADA) | 3001–3500 | Fan & LED merah nyala |
| HAZARDOUS | > 3500 | **Buzzer ON + LED merah + fan ON + alert** |

Alert sistem (`computeStatus`) tetap: gas > 3500 || suhu > 40°C || kelembapan > 75%. Ketiga
threshold ini berlaku juga di firmware ESP32 (logika lokal tetap jalan walau server mati).

## AI / Machine Learning (in-app)

Tanpa Python backend — dihitung di sisi server (`lib/ml.ts`):

- **Klasifikasi**: rule-based Decision Tree → `NORMAL` / `WASPADA` / `BAHAYA` dari suhu, kelembapan, gas.
- **Prediksi**: regresi linier sederhana dari 5 bacaan terakhir → prediksi nilai sensor & klasifikasi 5 menit ke depan.
- Ditampilkan di seksi "AI / Machine Learning" pada dashboard.

## Verifikasi integrasi

```bash
# Simulasi ESP32 mengirim data
curl -X POST http://localhost:3000/api/telemetry \
  -H "Content-Type: application/json" \
  -H "x-api-key: rahasia-untuk-esp32" \
  -d '{"device_id":"esp32-room-01","temperature":28.4,"humidity":67,"gas_value":3200,"fan_on":false,"buzzer_on":false,"led_red_on":false,"led_green_on":true}'

# Lihat data terbaru
curl http://localhost:3000/api/telemetry/latest

# Kirim perintah aktuator
curl -X POST http://localhost:3000/api/actuator \
  -H "Content-Type: application/json" \
  -d '{"device_id":"esp32-room-01","command":"fan_on"}'

# Cek perintah pending (dipakai ESP32)
curl "http://localhost:3000/api/actuator?device_id=esp32-room-01"
```

## Integrasi Arduino (ESP32)

Firmware final ada di `arduino/smart_room_monitoring/smart_room_monitoring.ino`
(salinan sanitasi; kredensial WiFi/API diisi placeholder),
panduan lengkap: [`arduino/README.md`](arduino/README.md).

Langkah singkat:

1. Set `WIFI_SSID` & `WIFI_PASS` di `.ino`.
2. Set `SERVER_HOST`:
   - dev: `http://<IP-laptop>:3000` (IP laptop saat `ifconfig | grep "inet "`)
   - produksi: `https://<nama-app>.vercel.app`
3. Set `API_KEY` sama dengan `IOT_API_KEY` di `.env.local`.
4. Upload via Arduino IDE (board ESP32 Dev Module).

ESP32 mengirim HTTP POST JSON tiap 10 detik ke `POST /api/telemetry` dengan header
`x-api-key`, dan polling perintah dashboard / status AI tiap 15 detik.

## API Contract

Base URL (dev): `http://localhost:3000`

Auth: `POST /api/telemetry` (ingest dari ESP32) wajib header `x-api-key: <IOT_API_KEY>`. Invalid → `401`. Route GET (read-only untuk dashboard) dapat diakses tanpa API key.

### POST /api/telemetry

Dipanggil ESP32 tiap 10 detik.

```bash
curl -X POST http://localhost:3000/api/telemetry \
  -H "Content-Type: application/json" \
  -H "x-api-key: rahasia-untuk-esp32" \
  -d '{"device_id":"esp32-room-01","temperature":28.4,"humidity":67,"gas_value":3200,"fan_on":false,"buzzer_on":false,"led_red_on":false,"led_green_on":true}'
```

### GET / POST / PATCH /api/actuator

- `GET ?device_id=` → daftar perintah pending (untuk ESP32).
- `POST { device_id, command, payload }` → kirim perintah dari dashboard.
- `PATCH { id }` → tandai perintah sudah dijalankan (ACK).

### GET Endpoints

| Route | Keterangan |
|-------|-----------|
| `GET /api/telemetry?limit=100&from=&to=` | History telemetry, urut `created_at DESC` |
| `GET /api/telemetry/latest` | 1 row terbaru |
| `GET /api/alerts?limit=50` | Log alert terbaru |
| `GET /api/stats?hours=24` | Statistik agregasi (avg/min/max + jumlah alert) |
| `GET /api/ml?type=all` | Klasifikasi + prediksi AI |
| `GET /api/actuator?device_id=` | Perintah aktuator pending |

## Struktur Folder

```
app/
├── api/
│   ├── telemetry/route.ts          # POST (ingest) + GET (history)
│   ├── telemetry/latest/route.ts   # GET data terbaru
│   ├── alerts/route.ts             # GET log alert
│   ├── stats/route.ts              # GET agregasi
│   ├── ml/route.ts                 # GET klasifikasi + prediksi AI
│   └── actuator/route.ts           # GET/POST/PATCH perintah aktuator
├── page.tsx                        # Dashboard
└── layout.tsx
components/
├── SensorCard.tsx
├── StatusBanner.tsx
├── ActuatorCard.tsx                # Toggle aktuator interaktif
├── TelemetryChart.tsx
├── AlertTable.tsx
├── StatsPanel.tsx
└── ... (ML cards, dll)
lib/
├── db.ts                           # Koneksi SQLite + schema
├── ml.ts                           # Klasifikasi & prediksi AI
├── thresholds.ts
├── validate.ts
└── types.ts
data/
└── smartroom.db                    # Database SQLite (auto-generated)
```

## Catatan Deploy

SQLite menyimpan data di **filesystem lokal**, jadi tidak cocok untuk serverless
(Vercel) tanpa volume persisten. Untuk produksi cloud, gunakan Supabase/Postgres
atau VPS + disk persisten (docker volume).