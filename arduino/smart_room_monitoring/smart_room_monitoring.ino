/*
 * ============================================================
 *  SMART ROOM MONITORING — ESP32 + WiFi Telemetry
 *  DHT11 + MQ-135 + LED Merah/Hijau + Buzzer + Relay Fan
 *  Kirim data ke Dashboard Next.js via HTTP POST JSON
 * ============================================================
 *
 *  LIBRARY YANG HARUS DIINSTALL (Arduino IDE > Tools > Manage Libraries):
 *   1. "DHT sensor library" by Adafruit  (+ otomatis butuh "Adafruit Unified Sensor")
 *   2. "ArduinoJson" by Benoit Blanchon  (v7.x)
 *
 *  CATATAN PENTING:
 *   - Logika alert tetap JALAN LOKAL (LED, buzzer, fan).
 *     Walau WiFi/server mati, sistem tetap berfungsi normal.
 *   - Jika kirim data gagal, hanya dilewati — coba lagi di interval berikutnya.
 * ============================================================
 */

#include <DHT.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ================= KONFIGURASI WIFI & SERVER =================
// GANTI dengan SSID & password WiFi kamu sendiri (di repositori ini
// sengaja di-sanitasi supaya kredensial tidak tayang di publik).
const char *WIFI_SSID = "WIFI_SSID_ANDA";   // <-- GANTI
const char *WIFI_PASS = "WIFI_PASSWORD_ANDA"; // <-- GANTI

// Saat development (ESP32 & laptop 1 jaringan WiFi):
//   TIDAK PERLU mengubah IP di sini — firmware otomatis memindai IP laptop
//   di jaringan (auto-discovery) saat boot. Cukup flash sekali.
//   SERVER_HOST di bawah hanya digunakan sebagai FALLBACK jika pemindaian
//   tidak menemukan server.
// Setelah deploy ke Vercel, ganti jadi:
//   "https://nama-app-kamu.vercel.app"
const char *SERVER_HOST = "http://IP_LAPTOP:3000";
String activeServer = String(SERVER_HOST); // diisi ulang hasil auto-discovery

String apiBase()      { return activeServer + "/api"; }
String telemetryUrl() { return apiBase() + "/telemetry"; }
String actuatorUrl()  { return apiBase() + "/actuator"; }
String mlUrl()        { return apiBase() + "/ml?type=classifications"; }

const char *API_KEY = "IOT_API_KEY_ANDA"; // HARUS sama dengan IOT_API_KEY di .env.local
const char *DEVICE_ID = "esp32-room-01";

// ====== SERVER REST (untuk auto control dari Dashboard/AI) ======
// Dashboard mengirim perintah (fan/buzzer/LED) ke /api/actuator.
// ESP32 polling endpoint ini untuk ambil + eksekusi perintah.
// Juga polling /api/ml untuk status AI (NORMAL/WASPADA/BAHAYA).

// ================= PIN CONFIGURATION =================
#define DHTPIN 4
#define DHTTYPE DHT11 // ganti ke DHT22 jika sensor aslinya DHT22
#define MQ135_AOUT 34 // ADC1, input-only
#define MQ135_DOUT 35 // tidak dipakai di v1 (digital out MQ-135, opsional)
#define LED_RED 25
#define LED_GREEN 26
#define BUZZER 27
#define RELAY_PIN 17

// Modul relay ini ACTIVE LOW dengan pull-up internal ke 5V:
//   - RELAY / fan ON  : GPIO = OUTPUT LOW  (IN ditarik ke GND -> relay klik)
//   - RELAY / fan OFF : GPIO = INPUT       (IN dibiarkan ngambang, pull-up
//                                            internal narik ke 5V -> relay diam)
// CATATAN: JANGAN pernah pakai digitalWrite HIGH untuk "off" — modul ini butuh
// 5V penuh, padahal GPIO ESP32 cuma 3.3V (3.3V masih dianggap ON oleh modul).

// ================= THRESHOLD =================
// Nilai ini OTOMATIS di-sync dari dashboard (GET /api/settings) tiap ≤30 detik,
// jadi kalibrasi yang kamu set di dashboard langsung dipakai ESP32.
// JANGAN edit manual — cukup ubah dari halaman "Kalibrasi Threshold" di dashboard.
int  GAS_THRESHOLD = 3500;   // ADC 0-4095 (default sementara sebelum sync)
float TEMP_THRESHOLD = 40.0; // °C      (default sementara sebelum sync)
float HUM_THRESHOLD = 75.0;  // %       (default sementara sebelum sync)

// ================= TIMING =================
const unsigned long READ_INTERVAL = 2000;  // baca sensor tiap 2 detik
const unsigned long SEND_INTERVAL = 10000; // kirim ke server tiap 10 detik
const unsigned long ML_POLL_INTERVAL = 15000; // polling perintah dashboard + status AI tiap 15 detik
const unsigned long SYNC_INTERVAL = 30000; // sync threshold dari dashboard tiap 30 detik
unsigned long lastRead = 0;
unsigned long lastSend = 0;
unsigned long lastMLPoll = 0;
unsigned long lastSync = 0;

// Setelah command manual/dashboard dieksekusi, auto lokal "diam" selama 15 detik
// supaya output yang kamu pilih tidak langsung ditimpa logika auto.
unsigned long manualOverrideUntil = 0;

// ================= STATE =================
// State aktuator terakhir (dikirim ke server agar dashboard akurat)
bool redState = false, greenState = false, buzzerState = false, fanState = false;
bool sensorError = false; // true jika DHT gagal dibaca
bool manualMode = false; // false = AUTO lokal nyala otomatis (LED/buzzer/fan ikut threshold)
bool cloudAuto = false;  // true = kontrol fan berdasar prediksi AI dari /api/ml
bool cloudAutoControl = true; // true = auto per threshold dari dashboard (di-sync dari /api/settings)
bool verbosePrint = true; // true = cetak Suhu/Status tiap 2 dtk; false = diam

// Penghitung gagal kirim + pengatur waktu scan ulang server (harus online)
int sendFailCount = 0;
unsigned long lastDiscover = 0;

// Cache pembacaan sensor terakhir yang valid
float lastTemp = 0.0;
float lastHum = 0.0;
int lastGas = 0;

WiFiClient client;             // untuk HTTP  (localhost / dev)
WiFiClientSecure secureClient; // untuk HTTPS (Vercel / production)

DHT dht(DHTPIN, DHTTYPE);

// ============================================================
//  WIFI
// ============================================================
void connectWiFi()
{
  WiFi.mode(WIFI_STA);

  Serial.println("[WiFi] Scan jaringan 2.4GHz sekitar:");
  WiFi.scanNetworks(true);            // scan async, biar secepatnya keluar
  delay(4000);                        // tunggu scan selesai
  int n = WiFi.scanComplete();
  if (n <= 0)
  {
    Serial.println("  !! Tidak ada WiFi 2.4GHz terdeteksi");
  }
  for (int i = 0; i < n; i++)
  {
    String candidate = WiFi.SSID(i);
    Serial.printf("  - \"%s\" (sinyal %d)%s\n", candidate.c_str(), WiFi.RSSI(i),
                  candidate == String(WIFI_SSID) ? "  <-- TARGET" : "");
  }
  WiFi.scanDelete();

  Serial.print("[WiFi] Menghubungkan ke \"" + String(WIFI_SSID) + "\"");
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 20000)
  {
    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED)
  {
    Serial.printf("\n[WiFi] Terhubung! IP: %s\n", WiFi.localIP().toString().c_str());
  }
  else
  {
    // Kode status: 1 = SSID tidak ketemu, 4 = password/persetujuan ditolak
    Serial.printf("\n[WiFi] Gagal konek! status=%d\n", WiFi.status());
    Serial.println("  status 1 = SSID TIDAK ditemukan (salah nama / jaringan 5GHz)");
    Serial.println("  status 4 = password ditolak atau AP menolak koneksi");
  }
}

// Cek & lapor status WiFi tiap ±10 detik. Kalau putus, coba sambung ulang.
void checkWiFi()
{
  static unsigned long lastCheck = 0;
  if (millis() - lastCheck < 10000)
    return;
  lastCheck = millis();

  if (WiFi.status() == WL_CONNECTED)
  {
    Serial.printf("[WiFi] Masih terhubung, IP: %s\n", WiFi.localIP().toString().c_str());
    return;
  }

  Serial.println("[WiFi] Terputus! Mencoba scan + sambung ulang...");
  WiFi.disconnect();
  connectWiFi();
}

// ============================================================
//  AUTO-DISCOVERY SERVER (cari laptop di jaringan)
// ============================================================
// Server dev (npm run dev) membuka port 3000. Endpoint /api/telemetry/latest
// butuh akses publik (tanpa API key) dan KEMBALI 200 — jadi cocok sebagai
// "tanda pengenal" server kita di antara perangkat lain di jaringan.
bool probeServer(const String &host)
{
  HTTPClient http;
  if (host.startsWith("https"))
  {
    secureClient.setInsecure();
    http.begin(secureClient, host + "/api/telemetry/latest");
  }
  else
  {
    http.begin(client, host + "/api/telemetry/latest");
  }
  http.setTimeout(400); // IP tidak ada di jaringan -> cepat dilewati
  int code = http.GET();
  http.end();
  return (code == 200);
}

// Pindai IP 2..254 di subnet yang sama dengan ESP32 (gateway sebagai acuan).
// Berhenti begitu menemukan server aktif di port 3000.
void discoverServer()
{
  if (WiFi.status() != WL_CONNECTED)
  {
    Serial.println("[Server] WiFi belum konek, auto-discovery dibatalkan.");
    return;
  }

  IPAddress gw = WiFi.gatewayIP();
  if (gw[0] == 0)
  {
    Serial.println("[Server] Gateway tidak valid — memakai SERVER_HOST bawaan.");
    return;
  }

  Serial.printf("[Server] Memindai %d.%d.%d.x:3000 untuk mencari laptop...\n",
                gw[0], gw[1], gw[2]);

  // Urutan 2..10 dulu (IP DHCP paling umum), sisanya naik. Umumnya ketemu < 2 detik.
  for (int i = 2; i <= 254; i++)
  {
    String host = "http://" + String(gw[0]) + "." + String(gw[1]) + "." +
                  String(gw[2]) + "." + String(i) + ":3000";
    if (probeServer(host))
    {
      activeServer = host;
      Serial.printf("[Server] KETEMU! Server aktif di %s\n", host.c_str());
      return;
    }
    if (i % 50 == 0) Serial.printf("[Server] ... sudah cek %d IP\n", i);
  }

  Serial.println("[Server] Tidak ada server di port 3000 — memakai SERVER_HOST bawaan.");
}

// ============================================================
//  SYNC THRESHOLD DARI DASHBOARD
// ============================================================
// GET /api/settings -> ambil gas/temp/hum threshold yang kamu set di dashboard.
// Dipakai logika ALERT LOKAL di ESP32, jadi walau koneksi ke cloud terputus
// LED/buzzer/fan tetap nyala menggunakan nilai terakhir yang di-sync.
void syncThresholds()
{
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  http.begin(client, activeServer + "/api/settings");
  http.setTimeout(3000);

  int code = http.GET();
  if (code != 200)
  {
    Serial.printf("[SET] Sync threshold HTTP %d\n", code);
    http.end();
    return;
  }

  String payload = http.getString();
  http.end();

  JsonDocument doc;
  DeserializationError err = deserializeJson(doc, payload);
  if (err)
  {
    Serial.println("[SET] Gagal parse /api/settings");
    return;
  }

  JsonObject s = doc["settings"].as<JsonObject>();
  if (s.isNull())
  {
    Serial.println("[SET] Respons tanpa object settings");
    return;
  }

  GAS_THRESHOLD = s["gas"] | GAS_THRESHOLD;
  TEMP_THRESHOLD = s["temp"] | TEMP_THRESHOLD;
  HUM_THRESHOLD = s["hum"] | HUM_THRESHOLD;
  cloudAutoControl = s["autoControl"] | true;

  Serial.printf("[SET] Threshold: gas=%d | suhu=%.1f | hum=%.1f | autoControl=%s\n",
                GAS_THRESHOLD, TEMP_THRESHOLD, HUM_THRESHOLD,
                cloudAutoControl ? "ON" : "OFF");
}

// ============================================================
//  OUTPUT AKTUATOR
// ============================================================
void setRelay(bool on)
{
  if (on)
  {
    pinMode(RELAY_PIN, OUTPUT);
    digitalWrite(RELAY_PIN, LOW); // tarik IN ke GND -> relay ON
  }
  else
  {
    pinMode(RELAY_PIN, INPUT); // IN ngambang -> pull-up internal relay ke 5V -> OFF
  }
}

void applyOutputs(bool red, bool green, bool buz, bool fan)
{
  digitalWrite(LED_RED, red ? HIGH : LOW);
  digitalWrite(LED_GREEN, green ? HIGH : LOW);
  digitalWrite(BUZZER, buz ? HIGH : LOW);
  setRelay(fan);
  redState = red;
  greenState = green;
  buzzerState = buz;
  fanState = fan;
}

// ============================================================
//  KIRIM TELEMETRY KE SERVER
// ============================================================
void sendTelemetry()
{
  // WiFi putus? Coba reconnect, skip kirim kali ini (tidak blocking lama)
  if (WiFi.status() != WL_CONNECTED)
  {
    Serial.println("[WiFi] Terputus, mencoba reconnect...");
    WiFi.disconnect();
    WiFi.reconnect();
    return;
  }

  HTTPClient http;

  // Deteksi otomatis http (dev) vs https (Vercel)
  if (telemetryUrl().startsWith("https"))
  {
    secureClient.setInsecure(); // skip verifikasi sertifikat (cukup untuk project)
    http.begin(secureClient, telemetryUrl());
  }
  else
  {
    http.begin(client, telemetryUrl());
  }

  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", API_KEY);
  http.setTimeout(5000);

  // Format JSON sesuai API contract di PRD
  JsonDocument doc; // ArduinoJson v7
  // StaticJsonDocument<256> doc; // <-- pakai ini jika ArduinoJson kamu v6
  doc["device_id"] = DEVICE_ID;
  doc["temperature"] = lastTemp;
  doc["humidity"] = lastHum;
  doc["gas_value"] = lastGas;
  doc["fan_on"] = fanState;
  doc["buzzer_on"] = buzzerState;
  doc["led_red_on"] = redState;
  doc["led_green_on"] = greenState;

  String body;
  serializeJson(doc, body);

  int code = http.POST(body);
  if (code > 0)
  {
    sendFailCount = 0;
    Serial.printf("[HTTP] Response %d -> %s\n", code, http.getString().c_str());
  }
  else
  {
    sendFailCount++;
    Serial.printf("[HTTP] Gagal kirim: %s (server mungkin mati, coba lagi nanti)\n",
                  http.errorToString(code).c_str());
  }
  http.end();

  // Server tidak terjangkau? Pindai ulang otomatis (maks 1x per menit).
  // Berguna kalau IP laptop berubah ketika ESP32 sudah jalan.
  if (sendFailCount >= 3 && millis() - lastDiscover > 60000)
  {
    lastDiscover = millis();
    sendFailCount = 0;
    Serial.println("[Server] Server tidak terjangkau — scan ulang otomatis...");
    discoverServer();
  }
}

// ============================================================
//  POLLING PERINTAH DARI DASHBOARD (fan/buzzer/LED)
// ============================================================
// GET /api/actuator -> daftar command pending
// Eksekusi lalu PATCH /api/actuator -> tandai sudah dijalankan
void pollDeviceCommands()
{
  if (WiFi.status() != WL_CONNECTED) return;

  String url = actuatorUrl() + "?device_id=" + DEVICE_ID;
  HTTPClient http;
  http.begin(client, url);
  http.setTimeout(5000);

  int code = http.GET();
  if (code != 200)
  {
    Serial.printf("[CMD] Poll HTTP %d — coba lagi nanti\n", code);
    http.end();
    return;
  }

  String payload = http.getString();
  http.end();

  JsonDocument doc;
  DeserializationError err = deserializeJson(doc, payload);
  if (err)
  {
    Serial.println("[CMD] Gagal parse response");
    return;
  }

  JsonArray arr = doc["data"].as<JsonArray>();
  if (arr.size() == 0) return;

  for (JsonObject cmd : arr)
  {
    int id = cmd["id"].as<int>();
    String command = cmd["command"].as<String>();
    Serial.printf("[CMD] Eksekusi #%d: %s\n", id, command.c_str());

    bool stateChanged = false;
    if (command == "fan_on")      { applyOutputs(redState, greenState, buzzerState, true); stateChanged = true; }
    else if (command == "fan_off") { applyOutputs(redState, greenState, buzzerState, false); stateChanged = true; }
    else if (command == "buzzer_on")  { applyOutputs(redState, greenState, true, fanState); stateChanged = true; }
    else if (command == "buzzer_off") { applyOutputs(redState, greenState, false, fanState); stateChanged = true; }
    else if (command == "led_red_on")  { applyOutputs(true, false, buzzerState, fanState); stateChanged = true; }
    else if (command == "led_red_off") { applyOutputs(false, true, buzzerState, fanState); stateChanged = true; }
    else if (command == "led_green_on")  { applyOutputs(redState, true, buzzerState, fanState); stateChanged = true; }
    else if (command == "led_green_off") { applyOutputs(redState, false, buzzerState, fanState); stateChanged = true; }
    else if (command == "all_on")  { applyOutputs(true, false, true, true); stateChanged = true; }
    else if (command == "all_off") { applyOutputs(false, true, false, false); stateChanged = true; }
    else if (command == "auto")
    {
      manualMode = false;
      cloudAuto = false;
      manualOverrideUntil = 0; // resume auto lokal sekarang juga
      Serial.println("[CMD] Mode AUTO (ikut sensor lokal)");
    }
    else if (command == "autocloud")
    {
      manualMode = false;
      cloudAuto = true;
      manualOverrideUntil = 0; // resume auto lokal sekarang juga
      Serial.println("[CMD] Mode AUTO-CLOUD (ikut AI)");
    }
    else
    {
      Serial.printf("[CMD] Perintah tidak dikenal: %s\n", command.c_str());
    }

    // Command state dari dashboard = "manual override": auto lokal dijeda
    // 15 detik supaya output pilihan kamu tidak langsung ditimpa.
    if (stateChanged) manualOverrideUntil = millis() + 15000;

    // Tandai perintah sebagai sudah dijalankan
    String ackUrl = actuatorUrl();
    HTTPClient ackHttp;
    ackHttp.begin(client, ackUrl);
    ackHttp.addHeader("Content-Type", "application/json");
    ackHttp.setTimeout(3000);
    String ackBody = "{\"id\":" + String(id) + "}";
    int ackCode = ackHttp.PATCH(ackBody);
    Serial.printf("[CMD] ACK #%d -> HTTP %d\n", id, ackCode);
    ackHttp.end();
  }
}

// ============================================================
//  POLLING STATUS AI/ML DARI SERVER
// ============================================================
// Ambil klasifikasi terbaru (NORMAL/WASPADA/BAHAYA) dari /api/ml.
// Kalau cloudAuto aktif:
//   - BAHAYA/WASPADA   -> fan ON  + LED merah + buzzer
//   - NORMAL           -> fan OFF + LED hijau
void pollMLStatus()
{
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  String url = mlUrl();
  http.begin(client, url);
  http.setTimeout(5000);

  int code = http.GET();
  if (code == 200)
  {
    String payload = http.getString();
    JsonDocument doc;
    DeserializationError err = deserializeJson(doc, payload);
    if (!err)
    {
      JsonArray arr = doc["classifications"].as<JsonArray>();
      if (arr.size() > 0)
      {
        String status = arr[0]["predicted_status"].as<String>();
        Serial.printf("[AI/ML] Status prediksi: %s\n", status.c_str());
        if (cloudAuto)
        {
          bool danger = (status == "BAHAYA" || status == "WASPADA");
          applyOutputs(danger, !danger, danger, danger);
        }
      }
      else
      {
        Serial.println("[AI/ML] Data klasifikasi kosong");
      }
    }
    else
    {
      Serial.println("[AI/ML] Gagal parse response");
    }
  }
  else
  {
    Serial.printf("[AI/ML] HTTP %d — coba lagi nanti\n", code);
  }
  http.end();
}

// ============================================================
//  SETUP
// ============================================================
void setup()
{
  Serial.begin(115200);
  delay(300);
  Serial.println();
  Serial.println("========= SMART ROOM FW v4 (WiFi Debug ON) =========");
  Serial.println("Kalau kamu TIDAK lihat baris ini di atas log sensor,");
  Serial.println("berarti board masih jalanin firmware lama. RST ulang!");
  Serial.println("====================================================");

  pinMode(LED_RED, OUTPUT);
  pinMode(LED_GREEN, OUTPUT);
  pinMode(BUZZER, OUTPUT);
  pinMode(MQ135_DOUT, INPUT);
  pinMode(RELAY_PIN, INPUT); // relay menganut "off saat ngambang"

  // Kondisi awal: normal — LED hijau nyala, lainnya mati
  applyOutputs(false, true, false, false);

  dht.begin();
  connectWiFi();

  // Cari server (laptop) otomatis di jaringan. Fallback: SERVER_HOST bawaan.
  discoverServer();
  syncThresholds(); // langsung ambil threshold yang di-set di dashboard
  Serial.printf("[Server] Aktif: %s\n", activeServer.c_str());

  Serial.println("Smart Monitoring Room - Starting...");
}

// ============================================================
//  LOOP — non-blocking pakai millis()
//  (sensor tetap dibaca & alert tetap responsif walau lagi kirim data)
// ============================================================
void loop()
{
  unsigned long now = millis();

  // ---------- 1. Baca sensor + logika alert LOKAL ----------
  if (now - lastRead >= READ_INTERVAL)
  {
    lastRead = now;

    float temp = dht.readTemperature();
    float hum = dht.readHumidity();
    int gas = analogRead(MQ135_AOUT);

    sensorError = isnan(temp) || isnan(hum);

    // AUTO lokal aktif: autoControl dashboard ON, mode manual mati, dan di luar
      // masa manual override 15 detik.
      bool autoActive = cloudAutoControl && !manualMode &&
                        (manualOverrideUntil == 0 || now >= manualOverrideUntil);

      if (sensorError)
      {
        Serial.println("Gagal membaca sensor DHT11!");
        if (autoActive) applyOutputs(true, false, true, true); // anggap tidak aman
      }
      else
      {
        lastTemp = temp;
        lastHum = hum;
        lastGas = gas;

        bool gasAlert = gas > GAS_THRESHOLD;
        bool tempAlert = temp > TEMP_THRESHOLD;
        bool humAlert = hum > HUM_THRESHOLD;

        if (autoActive)
        {
          if (gasAlert || tempAlert || humAlert)
          {
            applyOutputs(true, false, true, true); // LED merah + buzzer + fan/relay ON
          }
          else
          {
            applyOutputs(false, true, false, false); // kembali normal
          }
        }

      if (verbosePrint)
      {
        Serial.printf("Suhu: %.1f C | Kelembaban: %.1f %% | Gas: %d\n", temp, hum, gas);
        if (gasAlert || tempAlert || humAlert)
        {
          Serial.println("================================");
          if (gasAlert)  Serial.println("ALERT: Kadar GAS terlalu tinggi!");
          if (tempAlert) Serial.println("ALERT: Suhu terlalu tinggi!");
          if (humAlert)  Serial.println("ALERT: Kelembaban terlalu tinggi!");
          Serial.println("Fan AKTIF untuk sirkulasi/ventilasi.");
          Serial.println("================================");
        }
        else
        {
          Serial.println("Status: NORMAL");
        }
      }
    }
  }

  // ---------- 2. Kirim telemetry ke server ----------
  if (now - lastSend >= SEND_INTERVAL)
  {
    lastSend = now;

    if (sensorError)
    {
      Serial.println("[HTTP] Skip kirim — data sensor tidak valid.");
    }
    else
    {
      sendTelemetry(); // gagal kirim TIDAK mengganggu operasi lokal
    }
  }

  // ---------- 3. Status WiFi berkala (biar keliatan di serial) ----------
  checkWiFi();

  // ---------- 3b. Polling perintah dari dashboard ----------
  if (now - lastMLPoll >= ML_POLL_INTERVAL)
  {
    lastMLPoll = now;
    pollDeviceCommands();
    if (cloudAuto) pollMLStatus();
  }

  // ---------- 3c. Sync threshold dari dashboard (biar kalibrasi tetap terpakai) ----------
  if (now - lastSync >= SYNC_INTERVAL)
  {
    lastSync = now;
    syncThresholds();
  }

  // ---------- 4. Perintah manual dari Serial Monitor ----------
  if (Serial.available())
  {
    String cmd = Serial.readStringUntil('\n');
    cmd.toLowerCase();
    cmd.trim();
    Serial.println(">> Perintah: " + cmd);
    if (cmd == "hijau")
    {
      manualMode = true; applyOutputs(false, true, false, false);
      Serial.println("   LED HIJAU nyala (mode manual)");
    }
    else if (cmd == "merah")
    {
      manualMode = true; applyOutputs(true, false, true, true);
      Serial.println("   LED MERAH + buzzer + fan (mode manual)");
    }
    else if (cmd == "fan")
    {
      manualMode = true; applyOutputs(redState, greenState, buzzerState, !fanState);
      Serial.printf("   Fan -> %s\n", fanState ? "ON" : "OFF");
    }
    else if (cmd == "buzzer")
    {
      manualMode = true; applyOutputs(redState, greenState, !buzzerState, fanState);
      Serial.printf("   Buzzer -> %s\n", buzzerState ? "ON" : "OFF");
    }
    else if (cmd == "auto")
    {
      manualMode = false;
      cloudAuto = false;
      Serial.println("   Kembali mode OTOMATIS (ikuti sensor lokal)");
    }
    else if (cmd == "autocloud")
    {
      manualMode = false;
      cloudAuto = true;
      Serial.println("   Mode AUTO-CLOUD: fan ikut prediksi AI/ML dari server");
      pollMLStatus(); // langsung cek sekali
    }
    else if (cmd == "status")
    {
      Serial.printf("   manual=%s | cloudAuto=%s | sensorError=%s | verbose=%s | LED merah=%d hijau=%d buzzer=%d fan=%d\n",
                    manualMode ? "YA" : "TIDAK", cloudAuto ? "YA" : "TIDAK",
                    sensorError ? "YA" : "TIDAK",
                    verbosePrint ? "YA" : "TIDAK",
                    redState, greenState, buzzerState, fanState);
      Serial.printf("   threshold: gas=%d | suhu=%.1f | hum=%.1f | autoControl=%s | server=%s\n",
                GAS_THRESHOLD, TEMP_THRESHOLD, HUM_THRESHOLD,
                cloudAutoControl ? "ON" : "OFF", activeServer.c_str());
      Serial.printf("   manualOverride sisa %lu detik\n",
                    manualOverrideUntil > millis() ? (manualOverrideUntil - millis()) / 1000 : 0UL);
    }
    else if (cmd == "data")
    {
      Serial.printf("   Suhu: %.1f C | Kelembaban: %.1f %% | Gas: %d\n",
                    lastTemp, lastHum, lastGas);
    }
    else if (cmd == "quiet")
    {
      verbosePrint = false;
      Serial.println("   Mode QUIET: Suhu/Status tidak dicetak tiap 2 dtk lagi.");
    }
    else if (cmd == "verbose")
    {
      verbosePrint = true;
      Serial.println("   Mode VERBOSE: Suhu/Status dicetak tiap 2 dtk.");
    }
    else if (cmd == "cari")
    {
      discoverServer();
      Serial.printf("   Server aktif: %s\n", activeServer.c_str());
    }
    else
    {
      Serial.println("   Perintah: hijau | merah | fan | buzzer | auto | autocloud | status | data | quiet | verbose | cari");
    }
  }
}