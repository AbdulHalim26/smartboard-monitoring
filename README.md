# Smart Room Monitoring Dashboard

Dashboard monitoring ruangan real-time berbasis IoT. ESP32 membaca sensor DHT11 (suhu & kelembapan) dan MQ-135 (kualitas udara), mengendalikan aktuator (LED merah/hijau, buzzer, relay fan) berdasarkan threshold secara lokal, lalu mengirim data via WiFi (HTTP POST JSON) ke server Next.js yang menyimpannya ke Supabase dan menampilkannya di dashboard web real-time.

## Teknologi

- **Framework**: Next.js 14+ (App Router, TypeScript)
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Database**: Supabase (Postgres) + Realtime
- **Validasi**: Zod
- **Firmware**: Arduino IDE (WiFi.h + HTTPClient + ArduinoJson)

## Cara Menjalankan

```bash
npm install
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

### Mode Demo

Jika env Supabase belum diisi, dashboard berjalan dalam **mode demo** (data simulasi). Setelah env diisi dan SQL schema dijalankan, dashboard otomatis beralih ke mode live.

## Setup Database (Supabase)

1. Buat project baru di [supabase.com/dashboard](https://supabase.com/dashboard) (region terdekat).
2. Jalankan semua statement di `supabase/schema.sql` pada **SQL Editor** (menu SQL di sidebar kiri):
   - membuat tabel `telemetry` & `alerts`
   - index untuk query cepat
   - `alter publication supabase_realtime add table telemetry` → mengaktifkan Realtime.
3. Salin kredensial dari project Supabase: **Project Settings → API**.
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Isi file `.env.local` (buat dari `cp .env.local.example .env.local`):

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-public-key>
IOT_API_KEY=<rahasia-untuk-esp32>
```

> `IOT_API_KEY` adalah kunci khusus milikmu sendiri (bukan dari Supabase). Gunakan nilai
> yang sama persis dengan `API_KEY` di firmware Arduino (`arduino/smart_room_monitoring/*.ino`).

5. Restart dev server. Mode demo otomatis mati dan dashboard memakai data live dari Supabase.

### Verifikasi integrasi

Setelah env diisi dan server berjalan, uji dari terminal:

```bash
curl -X POST http://localhost:3000/api/telemetry \
  -H "Content-Type: application/json" \
  -H "x-api-key: rahasia-untuk-esp32" \
  -d '{"device_id":"esp32-room-01","temperature":28.4,"humidity":67,"gas_value":3200,"fan_on":false,"buzzer_on":false,"led_red_on":false,"led_green_on":true}'
```

Respons `201 {"ok":true,...}` berarti Supabase sudah tersambung. Data akan muncul
di dashboard < 5 detik (real-time subscribe / polling), masuk ke tabel `telemetry`,
dan pada tabel `alerts` jika status ALERT.

## Integrasi Arduino (ESP32)

Firmware final ada di `../arduino/smart_room_monitoring/smart_room_monitoring.ino`
(panduan lengkap: `../arduino/README.md`).

Langkah singkat:

1. Set `WIFI_SSID` & `WIFI_PASS` di `.ino`.
2. Set `SERVER_URL`:
   - dev: `http://<IP-laptop>:3000/api/telemetry` (IP laptop saat `ipconfig`)
   - produksi: `https://<nama-app>.vercel.app/api/telemetry`
3. Set `API_KEY` sama dengan `IOT_API_KEY` di `.env.local`.
4. Upload via Arduino IDE (board ESP32 Dev Module).

ESP32 mengirim HTTP POST JSON tiap 10 detik ke `POST /api/telemetry` dengan header
`x-api-key`. Logika alert (LED/buzzer/fan) tetap berjalan lokal di perangkat.

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

Request:

```json
{
  "device_id": "esp32-room-01",
  "temperature": 28.4,
  "humidity": 67,
  "gas_value": 3200,
  "fan_on": true,
  "buzzer_on": true,
  "led_red_on": true,
  "led_green_on": false
}
```

Threshold (satu sumber kebenaran di `lib/thresholds.ts`): status `ALERT` jika `gas_value > 3500 || temperature > 40 || humidity > 75`, else `NORMAL`.

### GET Endpoints

| Route | Keterangan |
|-------|-----------|
| `GET /api/telemetry?limit=100&from=&to=` | History telemetry, urut `created_at DESC`, limit default 100 (max 500) |
| `GET /api/telemetry/latest` | 1 row terbaru per device |
| `GET /api/alerts?limit=50` | Log alert terbaru |
| `GET /api/stats?hours=24` | Statistik agregasi (avg/min/max + jumlah alert) |

## Struktur Folder

```
app/
├── api/
│   ├── telemetry/route.ts          # POST (ingest) + GET (history)
│   ├── telemetry/latest/route.ts   # GET data terbaru
│   ├── alerts/route.ts             # GET log alert
│   └── stats/route.ts              # GET agregasi
├── page.tsx                        # Dashboard
└── layout.tsx
components/
├── SensorCard.tsx
├── StatusBanner.tsx
├── ActuatorCard.tsx
├── TelemetryChart.tsx
├── AlertTable.tsx
└── StatsPanel.tsx
lib/
├── supabase.ts
├── thresholds.ts
├── validate.ts
└── types.ts
```

## Deploy ke Vercel

```bash
npm run build
```

Setelah deploy, ganti `SERVER_URL` di firmware ESP32 ke domain publik Vercel dan isi variabel environment (Supabase URL, anon key, IOT_API_KEY) di dashboard Vercel.
