# Firmware ESP32 (sanitized copy)

Versi firmware ini adalah **salinan yang sudah disanitasi** untuk repositori publik:
`WIFI_SSID`, `WIFI_PASS`, `SERVER_HOST`, dan `API_KEY` diganti placeholder.
Kode asli yang dipakai di perangkat ada di folder `arduino/` di luar proyek ini
(satu tingkat di atas repo).

## Cara pakai

1. Salin `smart_room_monitoring.ino`.
2. Isi `WIFI_SSID`, `WIFI_PASS`, `SERVER_HOST`, dan `API_KEY` dengan nilai kamu.
   - `API_KEY` harus sama persis dengan `IOT_API_KEY` di `.env.local` dashboard.
   - `SERVER_HOST` hanya fallback -- firmware memindai server secara otomatis
     (auto-discovery), jadi di jaringan yang sama tidak perlu diubah.
3. Upload via Arduino IDE (board: ESP32 Dev Module). Library wajib:
   - DHT sensor library (Adafruit)
   - ArduinoJson v7

## Rangkuman fungsi firmware

- Baca DHT11 (GPIO 4) + MQ-135 (GPIO 34) tiap 2 detik (non-blocking, `millis()`).
- Logika alert **lokal**: suhu/kelembapan/gas melewati threshold -> LED merah,
  buzzer, fan menyala walau WiFi/server mati.
- Kirim `POST /api/telemetry` tiap 10 detik (header `x-api-key`).
- Polling `GET /api/actuator` tiap 15 detik untuk perintah dashboard -> ACK.
- Polling `GET /api/ml` tiap 15 detik untuk mode `autocloud`.
- Sinkron threshold dari `GET /api/settings` tiap 30 detik.
- Auto-discovery server + fallback `SERVER_HOST`; perintah Serial: `status`, `cari`.

## Wiring (ringkas)

| Komponen | Pin ESP32 |
|----------|-----------|
| DHT11 DATA | GPIO 4 |
| MQ-135 AO | GPIO 34 |
| LED merah | GPIO 25 |
| LED hijau | GPIO 26 |
| Buzzer | GPIO 27 |
| Relay/fan | GPIO 17 (active-LOW) |