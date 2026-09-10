#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generator dokumen presentasi:
  Smart Room IoT Monitoring - Panduan & Script Presentasi (Word + PDF)

Konten ditulis sekali (I_CONTENT), lalu di-render ke .docx (python-docx)
dan .pdf (reportlab platypus). Konten sengaja dijaga Latin-1-safe agar
font bawaan reportlab (Helvetica) tidak pecah (tanpa emoji/panah Unicode).
"""

import os

OUT_DOCX = os.path.join(os.path.dirname(__file__), "Smart_Room_IoT_Presentasi.docx")
OUT_PDF = os.path.join(os.path.dirname(__file__), "Smart_Room_IoT_Presentasi.pdf")

# ============================================================
# KONTEN
# ============================================================

I_CONTENT = []


def T(text):  # title halaman
    I_CONTENT.append(("title", text))


def H1(text):  # judul bab
    I_CONTENT.append(("h1", text))


def H2(text):  # sub-judul
    I_CONTENT.append(("h2", text))


def H3(text):  # sub-sub-judul
    I_CONTENT.append(("h3", text))


def P(text):  # paragraf biasa
    I_CONTENT.append(("p", text))


def B(text):  # bullet
    I_CONTENT.append(("bullet", text))


def B2(text):  # sub-bullet
    I_CONTENT.append(("bullet2", text))


def N(text):  # kotak narasi siap ucap
    I_CONTENT.append(("narasi", text))


def C(text):  # blok kode / mono
    I_CONTENT.append(("code", text))


def TB(header, rows):  # tabel
    I_CONTENT.append(("table", (header, rows)))


def PB():  # ganti halaman
    I_CONTENT.append(("pagebreak", ""))


# ============================================================
# KONTEN DOKUMEN
# ============================================================

# ---------- SAMPUL ----------
T("Smart Room IoT Monitoring")
P("Dashboard Monitoring Ruangan Real-time berbasis IoT + Integrasi Machine Learning")
P("Panduan & Script Presentasi - Internet of Things, Semester 5")
P("Konten: penjelasan tiap bagian yang dikerjakan, keputusan teknis & alasan, "
  "plus narasi siap diucapkan (estimasi waktu per bagian).")
PB()

# ---------- 1. RINGKASAN ----------
H1("Bagian 0 - Ringkasan Proyek (Slide 1)")
P("Sistem yang saya bangun adalah smart room monitoring berbasis IoT. ESP32 membaca sensor "
  "DHT11 (suhu & kelembapan) dan MQ-135 (kualitas udara / asap), lalu mengendalikan aktuator "
  "(LED merah/hijau, buzzer, relay fan). Data dikirim lewat WiFi ke server web (Next.js) "
  "menggunakan HTTP POST JSON tiap 10 detik, disimpan di database lokal SQLite, dan "
  "ditampilkan di dashboard web secara real-time.")
P("Yang membuat sistem ini menarik: logika alert (LED, buzzer, fan) tetap berjalan LOKAL di "
  "ESP32. Kalau WiFi atau server mati, perlindungan ruangan tetap jalan. Server hanya "
  "menerima, menyimpan, menampilkan, dan mengirim perintah kontrol.")
N("Narasi (kurang lebih 1 menit):")
P('  "Selamat pagi/siang. Proyek saya adalah sistem monitoring ruangan berbasis IoT. '
  'ESP32 membaca suhu, kelembapan, dan kualitas udara, lalu jika terdeteksi kondisi berbahaya, '
  'sistem langsung menyalakan buzzer, LED merah, dan kipas -- dan yang penting, logika ini '
  'tetap bekerja meskipun WiFi atau server mati, karena semua keputusan juga diambil lokal '
  'di perangkat. Dashboard web-nya saya buat berbasis Next.js, yang menerima data tiap 10 detik, '
  'menyimpannya, dan menampilkannya secara real-time. Nanti saya jelaskan detail tiap bagian dan '
  'alasan di balik setiap keputusan teknis."')
PB()

# ---------- 2. ARSITEKTUR ----------
H1("Bagian 1 - Arsitektur Sistem (Slide 2)")
H2("Apa yang dikerjakan")
P("Saya merancang arsitektur dengan alur data satu arah dan dua loop kontrol:")
B("ESP32 -> Next.js API -> SQLite -> Dashboard: sensor dibaca 2 detik sekali, dikirim ke "
  "server tiap 10 detik, divisualisasikan ke dashboard.")
B("Loop kontrol aktuator (dashboard -> ESP32): dashboard menulis perintah ke tabel "
  "device_commands, ESP32 mengecek tiap 15 detik, mengeksekusi, lalu melaporkan ACK.")
B("Loop kontrol auto (threshold/AI): server menghitung status dari threshold yang bisa "
  "dikalibrasi, lalu mengantrekan perintah otomatis ke ESP32. Firmware juga menyinkronkan "
  "threshold dari server tiap 30 detik.")
H2("Keputusan teknis & alasan")
B("Beberapa logika tetap di ESP32 (offline-proof) -- prinsip utama dari PRD: perlindungan "
  "tidak boleh bergantung pada koneksi internet.")
B("Frontend dan backend dalam satu project Next.js (App Router) -- cukup satu project, satu "
  "proses deploy, dan tipe data bisa dipakai bersama.")
B("Real-time dengan polling sederhana, bukan WebSocket -- kebutuhan hanya menampilkan data "
  "yang datang tiap 10 detik. Polling 5 detik cukup memenuhi kriteria 'data muncul di "
  "dashboard kurang dari 5 detik', tanpa perlu koneksi persisten atau server push.")
B("Dua jalur kontrol (manual vs otomatis) dipisah dengan jelas dan ada mekanisme prioritas "
  "(grace period manual 15 detik di firmware), supaya pengguna tidak berkelahi dengan logika auto.")
N("Narasi (kurang lebih 1 menit 30 detik):")
P('  "Arsitekturnya saya sederhanakan menjadi alur data satu arah. ESP32 mengirim data '
  'ke API Next.js, lalu disimpan ke SQLite dan ditampilkan di dashboard. Untuk kontrol, '
  'ada dua loop: yang pertama dari dashboard ke ESP32 lewat perintah berantre, dan yang '
  'kedua dari server yang otomatis mengatur aktuator berdasarkan threshold. Saya sengaja '
  'menyimpan keputusan alert di ESP32 juga, supaya ketika internet mati sistem tetap aman. '
  'Untuk real-time, saya memilih polling ketimbang WebSocket karena interval datanya 10 detik, '
  'sehingga polling 5 detik sudah terasa real-time tanpa menjaga koneksi permanen."')
PB()

# ---------- 3. STACK ----------
H1("Bagian 2 - Teknologi yang Dipakai & Alasannya (Slide 3)")
TB(
    ["Layer", "Teknologi", "Alasan"],
    [
        ["Framework", "Next.js (App Router + TypeScript)", "API & dashboard 1 project, type-safe"],
        ["Styling", "Tailwind CSS v4", "Cepat, konsisten, mudah dibuat responsif"],
        ["Chart", "Recharts", "Ringan, native React, cocok untuk line chart tren"],
        ["Database", "SQLite (better-sqlite3)", "Lokal, tanpa setup cloud, cukup untuk demo"],
        ["Validasi", "Zod", "Payload dari ESP32 wajib divalidasi sebelum masuk DB"],
        ["Firmware", "Arduino (WiFi.h + HTTPClient + ArduinoJson)", "File JSON kecil, hemat RAM di ESP32"],
        ["ML (eksperimen)", "Python: pandas, scikit-learn, statsmodels", "Analisis data & eksperimen model"],
        ["ML (produksi)", "TypeScript in-app (lib/ml.ts)", "Berjalan langsung di server tanpa proses tambahan"],
    ],
)
H2("Keputusan penting yang bisa ditanyakan")
H3("Mengapa migrasi dari Supabase ke SQLite?")
P("Di versi awal (PRD) saya menggunakan Supabase/Postgres. Saat pengembangan lanjutan, saya "
  "pertimbangkan kebutuhan: data hanya dari satu device, kualitas datanya real-time cukup "
  "di-poll, dan dashboard dipakai lokal. SQLite memberi keuntungan: tanpa registrasi cloud, "
  "tanpa latensi jaringan, data dalam satu file (data/smartroom.db), setup instan lewat "
  "npm install + npm run dev. Skema tabel pun dibuat otomatis saat server pertama jalan. "
  "Trade-off-nya jelas saya catat: SQLite tidak cocok untuk produksi serverless multi-user; "
  "untuk itu tetap dibutuhkan Postgres/Supabase. Dalam demo ini, lokal SQLite adalah "
  "keputusan yang paling sederhana dan andal.")
H3("Mengapa polling, bukan WebSocket atau Supabase Realtime?")
B("Data masuk tiap 10 detik -- kebutuhan menampilkan ulang sangat rendah.")
B("Polling HTTP stateless: mudah diuji, tidak ada koneksi yang harus dijaga, tidak ada "
  "infrastruktur server tambahan.")
B("Kriteria acceptance (data muncul < 5 detik) terpenuhi dengan polling 5 detik.")
B("Supabase Realtime hanya berguna bila data dikirim oleh banyak sumber bersamaan -- di sini tidak.")
H3("Mengapa Zod?")
P("Perangkat IoT adalah sumber data yang luar biasa -- kadang mengirim NaN, string, atau nilai "
  "di luar rentang. Zod membuat kontrak yang ketat: temperature & humidity wajib number "
  "(bukan NaN), gas_value integer 0-4095, boolean opsional. Payload tak valid ditolak dengan "
  "status 400 dan pesan yang jelas.")
N("Narasi (kurang lebih 1 menit 30 detik):")
P('  "Untuk teknologi, inti saya pakai Next.js agar API dan dashboard jadi satu project. '
  'Database-nya saya buat lokal dengan SQLite; awalnya proyek ini memakai Supabase, tapi '
  'karena data datang hanya dari satu perangkat dan kebutuhan real-time-nya sederhana, '
  'SQLite lebih cepat dan tanpa biaya cloud. Data tersimpan dalam satu file dan tabelnya '
  'otomatis dibuat saat server pertama berjalan. Validasi payload ESP32 saya kerjakan dengan '
  'Zod supaya data rusak seperti NaN tidak pernah masuk database, dan untuk real-time '
  'saya pakai polling lima detik karena interval pengiriman datanya sepuluh detik."')
PB()

# ---------- 4. FIRMWARE INTI ----------
H1("Bagian 3 - Firmware ESP32: Inti (Slide 4-6)")
H2("Rangkaian & pin (sumber kebenaran)")
TB(
    ["Komponen", "Pin ESP32", "Catatan"],
    [
        ["DHT11 (suhu & kelembapan)", "GPIO 4 (DATA)", "3V3 - GND"],
        ["MQ-135 (kualitas udara)", "GPIO 34 (AO, ADC1)", "VCC 5V/VIN, ADC input-only"],
        ["LED merah (indikator bahaya)", "GPIO 25", "via resistor 220 ohm"],
        ["LED hijau (indikator normal)", "GPIO 26", "via resistor 220 ohm"],
        ["Buzzer", "GPIO 27", ""],
        ["Relay / fan", "GPIO 17", "Active-LOW, lihat catatan"],
    ],
)
P("Catatan relay: modul relay ini Active-LOW dengan pull-up internal ke 5V. GPIO LOW = relay "
  "ON (fan menyala), GPIO di-set INPUT (ngambang) = relay OFF. Yang penting: JANGAN memakai "
  "digitalWrite HIGH untuk mematikan, karena GPIO ESP32 cuma 3.3V sedangkan modul butuh 5V "
  "penuh untuk dianggap OFF.")
H2("Pembacaan sensor non-blocking (millis)")
P("Loop utama tidak memakai delay() agar tetap responsif. Ada 4 timer independen berbasis "
  "millis: baca sensor tiap 2 detik, kirim ke server tiap 10 detik, polling perintah "
  "dashboard + status AI tiap 15 detik, dan sinkronisasi threshold tiap 30 detik.")
H2("Logika alert lokal (offline-proof)")
P("ESP32 menyimpan threshold sendiri dan mengevaluasi sensor tiap 2 detik. Jika suhu, "
  "kelembapan, atau gas melewati threshold, maka LED merah + buzzer + fan langsung aktif -- "
  "ini berjalan penuh tanpa internet. Kirim data ke server hanyalah 'bonus' untuk "
  "pencatatan; kalau gagal, ESP32 cukup mencatat kegagalan dan mencoba lagi.")
H2("Kirim data dengan autentikasi")
P("Setiap POST /api/telemetry menyertakan header x-api-key yang harus sama persis dengan "
  "IOT_API_KEY di .env.local -- jika salah, server menolak dengan 401. Body dikirim "
  "sebagai JSON berisi device_id, temperature, humidity, gas_value, serta state aktuator "
  "(fan_on, buzzer_on, led_red_on, led_green_on).")
N("Narasi (kurang lebih 2 menit):")
P('  "Sekarang ke firmware. Perangkat kerasnya sederhana: satu DHT11 untuk suhu dan '
  'kelembapan, satu MQ-135 untuk kualitas udara, lalu dua LED, buzzer, dan relay kipas. '
  'Satu hal penting soal relay: modul yang saya pakai adalah active-low, jadi menyalakan '
  'kipas berarti menurunkan pin, dan mematikannya berarti pin dibuat mengambang -- karena '
  'GPIO 3.3 volt tidak cukup kuat untuk modul 5 volt. Loop utama saya tulis non-blocking '
  'memakai millis, jadi membaca sensor, mengirim data, dan mengecek perintah berjalan '
  'bergantian tanpa saling menahan. Yang paling penting: pengecekan bahaya dilakukan lokal '
  'di perangkat, jadi kalau WiFi mati atau server mati, buzzer dan kipas tetap bekerja. '
  'Setiap kirim data juga saya autentikasi dengan API key supaya hanya perangkat saya yang '
  'bisa mengirim."')
PB()

# ---------- 5. FIRMWARE FITUR BARU ----------
H1("Bagian 4 - Firmware: Fitur Unggulan yang Baru Dikembangkan (Slide 5, 8, 12)")
H2("1) Auto-discovery server")
P("Sebelumnya setiap ganti jaringan harus mengganti IP laptop di kode firmware. Sekarang "
  "firmware otomatis memindai jaringan (fungsi probeServer / discoverServer) saat boot untuk "
  "menemukan server dashboard, dan hanya menggunakan SERVER_HOST sebagai fallback. Karena "
  "itu cukup flash sekali dan firmware langsung menemukan server di jaringan yang sama.")
H2("2) Sinkronisasi threshold dari dashboard")
P("Threshold sekarang milik server (single source of truth) dan disinkronkan ke ESP32 "
  "tiap 30 detik lewat GET /api/settings. Artinya kalibrasi yang dilakukan dari halaman "
  "dashboard langsung dipakai juga oleh logika lokal ESP32 -- tanpa perlu flash ulang.")
H2("3) Auto-control dengan mode yang jelas")
B("manualMode=false secara default: logika auto lokal ON (mengikuti threshold).")
B("cloudAutoControl: ikut toggle di dashboard (autoControl di /api/settings). Jika mati, "
  "server berhenti mengantrekan perintah otomatis.")
B("Manual override: setiap perintah manual/dashboard menetapkan manualOverrideUntil = "
  "15 detik ke depan, sehingga output yang kita pilih tidak langsung ditimpa logika auto.")
B("Mode autocloud: fan mengikuti klasifikasi AI (NORMAL/WASPADA/BAHAYA) lewat polling "
  "/api/ml tiap 15 detik.")
H2("4) Perintah Serial untuk debugging")
P("Serial Monitor menerima perintah: hijau, merah, fan, buzzer, auto, autocloud, status "
  "(menampilkan threshold & server aktif), dan cari (memindai ulang server).")
N("Narasi (kurang lebih 2 menit):")
P('  "Ada empat kemampuan firmware yang saya tambahkan. Pertama, auto-discovery: saya tidak '
  'perlu lagi mengubah alamat IP di kode setiap pindah jaringan, karena ESP32 memindai '
  'jaringan dan menemukan server secara otomatis. Kedua, sinkronisasi threshold: saya '
  'menjadikan server sebagai sumber kebenaran tunggal, dan ESP32 menarik nilai threshold '
  'setiap tiga puluh detik -- jadi kalau saya mengubah batas gas dari dashboard, logika '
  'lokal di perangkat ikut berubah tanpa menulis ulang firmware. Ketiga, auto-control '
  'dengan prioritas: logika otomatis menyala secara default, tetapi setiap perintah manual '
  'diberi masa tenggang lima belas detik supaya tidak langsung tertimpa. Dan keempat, '
  'mode autocloud di mana kipas mengikuti hasil AI. Semua ini bisa saya uji lewat Serial '
  'Monitor dengan perintah seperti status dan cari."')
PB()

# ---------- 6. BACKEND API ----------
H1("Bagian 5 - Backend API (Slide 2, 8, 12)")
H2("Apa yang dikerjakan")
TB(
    ["Route", "Fungsi"],
    [
        ["POST /api/telemetry", "Ingest dari ESP32: validasi Zod + API key, hitung status, simpan, buat alert"],
        ["GET /api/telemetry?limit", "Riwayat data (default 100, max 500, filter from/to)"],
        ["GET /api/telemetry/latest", "1 data terbaru untuk kartu real-time"],
        ["GET /api/alerts?limit", "Log alert terbaru"],
        ["GET /api/stats?hours", "Agregasi avg/min/max + jumlah alert"],
        ["GET/POST/PATCH /api/actuator", "Kelola perintah aktuator (web control + polling ESP32 + ACK)"],
        ["GET/POST /api/settings", "Baca/simpan kalibrasi threshold + auto-control"],
        ["GET /api/ml", "Klasifikasi & prediksi AI (in-app)"],
    ],
)
H2("Logika utama di POST /api/telemetry")
B("Keamanan: header x-api-key dibandingkan dengan env IOT_API_KEY -> salah = 401.")
B("Validasi: skema Zod -> salah = 400 dengan pesan field apa yang gagal.")
B("Status dihitung dari threshold yang TERSIMPAN di database (bukan hardcode): gas/temp/hum "
  "melampaui ambang -> status ALERT. Satu fungsi computeStatus di lib/thresholds.ts menjadi "
  "satu-satunya tempat menentukan NORMAL/ALERT.")
B("Saat ALERT: untuk setiap pelanggaran (GAS/TEMP/HUM) dibuat satu baris di tabel alerts "
  "berisi nilai aktual vs threshold yang dipakai -- transparan dan mudah dijelaskan.")
B("Auto-control terpusat (queueAutoControl): jika autoControl aktif, server mengantrekan "
  "perintah (fan_on, buzzer_on, led_red_on, led_green_off, dst) ke device_commands. "
  "Penting: hanya saat state BERUBAH dari laporan ESP32, dan dicegat duplikat jika masih ada "
  "perintah pending sejenis -- mencegah spam tiap 10 detik.")
H2("Web control aktuator (alur lengkap)")
P("Klik toggle di dashboard -> POST /api/actuator menyimpan perintah ke device_commands "
  "(executed=0) -> ESP32 polling GET /actuator tiap 15 detik -> mengeksekusi pin -> "
  "melaporkan ACK lewat PATCH /actuator -> dashboard menampilkan status terbaru.")
N("Narasi (kurang lebih 2 menit):")
P('  "Backendnya berupa API Next.js. Titik masuk utama adalah POST telemetry. Saya '
  'menjaga keamanan dengan membandingkan API key, lalu memvalidasi seluruh payload dengan '
  'Zod sebelum menyimpan. Status normal atau alert dihitung dari threshold yang tersimpan '
  'di database, bukan nilai hardcode, sehingga bisa dikalibrasi. Kalau statusnya alert, '
  'untuk setiap pelanggaran saya catat satu baris alert beserta nilai dan ambangnya, dan '
  'yang menarik: server bisa mengantrekan perintah otomatis ke ESP32 -- tapi hanya ketika '
  'keadaan benar-benar berubah sukar untuk mencegah perintah berulang setiap sepuluh detik. '
  'Untuk mengontrol aktuator dari dashboard, saya pakai model perintah berantre: dashboard '
  'menulis perintah, ESP32 mengambilnya tiap lima belas detik, mengeksekusi, lalu melaporkan '
  'hasilnya."')
PB()

# ---------- 7. DATABASE & REAL-TIME ----------
H1("Bagian 6 - Database & Real-time (Slide 2, 6, 14)")
H2("Apa yang dikerjakan")
P("Skema database dibuat otomatis di lib/db.ts memakai better-sqlite3 dengan mode WAL. "
  "Baris data disimpan di file data/smartroom.db. Tabel yang dibuat:")
B("telemetry -- satu baris per pembacaan 10 detik (nilai sensor + status + state aktuator).")
B("alerts -- catatan pelanggaran dengan alert_type, nilai vs threshold.")
B("device_commands -- antrean perintah aktuator (manual & auto) untuk di-poll ESP32.")
B("ml_classifications & ml_predictions -- hasil klasifikasi/prediksi AI.")
B("settings -- key-value untuk kalibrasi threshold & auto-control (di-seed dengan default: "
  "gas 500, temp 32.0, hum 75.0, auto-control ON).")
P("Indeks dibuat pada kolom yang sering dipakai: created_at, device_id, dan executed "
  "untuk antrean perintah. Timestamp memakai datetime lokal server agar mudah dibaca.")
H2("Kenapa real-time pakai polling, bukan push")
B("Interval data 10 detik -> polling 5 detik sudah real-time secara visual.")
B("Tanpa koneksi persisten: tidak ada WebSocket yang harus dijaga, tidak ada server "
  "realtime tambahan, lebih mudah di-debug.")
B("Fallback otomatis: kalau polling gagal (server restart), browser cukup mencoba lagi "
  "di interval berikutnya.")
B("Offline detection: jika data terakhir lebih dari 30 detik, dashboard menampilkan badge "
  "OFFLINE -- ini logika sederhana dari polling yang ada.")
N("Narasi (kurang lebih 1 menit):")
P('  "Data saya simpan di SQLite lokal, dan tabelnya saya buat otomatis. Ada tabel untuk '
  'telemetry, alert, antrean perintah aktuator, hasil AI, dan pengaturan threshold yang '
  'dirancang sedemikian rupa -- pakai indeks pada kolom waktu dan id agar query cepat. '
  'Untuk real-time saya pilih polling daripada push karena interval datanya sepuluh detik; '
  'polling lima detik membuat dashboard terasa hidup tanpa harus menjaga koneksi permanen. '
  'Deteksi perangkat offline juga saya bangun dari polling ini -- kalau tidak ada data '
  'selama lebih dari tiga puluh detik, statusnya berubah menjadi offline."')
PB()

# ---------- 8. EDA ----------
H1("Bagian 7 - EDA & Penentuan Threshold dari Data Riil (Slide 13)")
H2("Apa yang dikerjakan")
P("Daripada menebak nilai threshold, saya melakukan Exploratory Data Analysis terhadap "
  "855 baris data riil yang sudah terkumpul: statistik deskriptif, korelasi, dan plot "
  "distribusi (histogram, boxplot, trend). Tujuannya untuk menentukan batas NORMAL / "
  "WASPADA / BAHAYA dari kondisi ruangan yang sebenarnya.")
H2("Hasil statistik & korelasi")
TB(
    ["Sensor", "Statistik (data riil)"],
    [
        ["Suhu", "mean 31.73 C, std 1.02, range 28.4 - 33.8 C"],
        ["Kelembapan", "mean 67.46%, std 6.14, range 56 - 76%"],
        ["Gas", "mean 106 ADC, std 172, max 3900 (spike)"],
    ],
)
B("Korelasi suhu vs kelembapan = -0.94: kuat negatif (makin panas makin kering) -- fisikanya masuk akal.")
B("Korelasi gas vs suhu/hum sangat lemah: gas bersifat independen.")
H2("Threshold final & alasannya")
TB(
    ["Parameter", "Nilai", "Dasar keputusan"],
    [
        ["TEMP_WASPADA", "33.0 C", "Data normal 31-33 C, p95 = 32.8 C (bukan 30 yang terlalu agresif)"],
        ["TEMP_BAHAYA", "36.0 C", "Referensi hangat ekstrem"],
        ["HUM_LOW", "30.0%", "Referensi kenyamanan (data tidak pernah < 59%)"],
        ["HUM_HIGH", "75.0%", "Mendekati max data 76%"],
        ["GAS_WASPADA", "1500 ADC", "Referensi MQ-135"],
        ["GAS_BAHAYA", "2500 ADC", "Referensi MQ-135"],
    ],
)
P("Catatan: ada dua lapis threshold. (1) Alert sistem (computeStatus) memakai threshold "
  "kalibrasi di dashboard -- default gas 500, temp 32, hum 75 -- untuk keputusan cepat yang "
  "konservatif. (2) Klasifikasi ML memakai level WASPADA/BAHAYA hasil EDA di atas untuk "
  "kategorisasi NORMAL/WASPADA/BAHAYA. Keduanya didefinisikan dari data, bukan asal tebak.")
N("Narasi (kurang lebih 1 menit 30 detik):")
P('  "Sebelum menentukan ambang bahaya, saya menganalisis dulu data riil yang sudah '
  'terkumpul -- delapan ratus lima puluh lima baris. Dari situ saya tahu suhu ruangan '
  'normalnya sekitar tiga puluh satu sampai tiga puluh tiga derajat, jadi saya menjadikan '
  'tiga puluh tiga derajat sebagai zona waspada, bukan nilai yang terlalu agresif. '
  'Korelasi suhu dan kelembapan yang sangat negatif juga membuktikan data itu masuk akal. '
  'Untuk gas, karena data bersih, ambangnya saya ambil dari referensi sensor MQ-135. '
  'Jadi keputusan threshold di sini berbasis data dan referensi, bukan tebakan."')
PB()

# ---------- 9. ML ----------
H1("Bagian 8 - Machine Learning (Slide 7-11)")
H2("Jalur eksperimen: Python (analisis & validasi)")
B("Preprocessing (preprocessing.py): deteksi spike memakai metode IQR lalu penggantian "
  "forward-fill (18 spike terdeteksi), dan interpolasi linear untuk data hilang pada gap "
  "10-300 detik (27 baris terisi). Gap yang lebih panjang (perangkat mati) dibiarkan.")
B("Feature engineering: untuk tiap sensor dibuat fitur mean rolling 10 baris, std rolling, "
  "delta antar baris, plus jam dalam sehari -> 13 kolom fitur. Alasannya: kondisi ruangan tidak "
  "tergantung nilai sesaat saja, tapi juga tren dan kecepatan perubahannya.")
B("Decision Tree (scikit-learn): max_depth 6, random_state 42; dilabeli rule-based hasil "
  "EDA; retrain tiap 60 detik dan disimpan ke dt_classifier.joblib.")
B("ARIMA (statsmodels): order (1,1,1), resample per jam, forecast 3 jam ke depan.")
H2("Jalur produksi: ML in-app di server (lib/ml.ts)")
P("Agar demo berdiri sendiri tanpa proses Python terpisah, saya implementasikan kembali "
  "logika cerdas langsung di TypeScript server:")
B("classifyReading: skor berbasis threshold dengan multiplier bertingkat (mis. gas > "
  "threshold -> skor 1, > 1.15x -> 2, > 1.3x -> 3). Total >= 2 = WASPADA, >= 4 = BAHAYA, "
  "selain itu NORMAL; confidence dihitung dari skor. Alasan memakai rule-based: mudah "
  "dijelaskan, deterministik, dan langsung bisa memantik aktuator.")
B("PredictNextValues / linearRegressionPrediction: regresi linier dari 30 bacaan terakhir "
  "untuk memperkirakan nilai 5 menit ke depan, lalu diklasifikasikan lagi. Alasan memakai "
  "regresi linier: ringan, tanpa library, cukup untuk tren jangka pendek.")
H2("Kenapa dua jalur?")
P("Python dipakai untuk eksplorasi, visualisasi, dan bukti konsep (bisa dibuat notebook "
  "atau plot). TypeScript in-app dipakai di produksi demo supaya server Next.js itu sendiri "
  "yang menghitung tanpa perlu menjalankan proses Python -- satu unit yang berjalan hanya "
  "dengan npm run dev.")
N("Narasi (kurang lebih 2 menit):")
P('  "Bagian AI saya kerjakan dalam dua jalur. Jalur eksplorasi memakai Python untuk '
  'membersihkan data -- misalnya deteksi spike dengan metode IQR supaya lonjakan gas palsu '
  'tidak merusak model -- lalu membuat fitur turunan seperti rata-rata berjalan dan '
  'kecepatan perubahan. Model klasifikasinya Decision Tree dan prediksi trennya ARIMA. '
  'Kemudian, supaya demo tidak bergantung pada proses Python yang harus berjalan terpisah, '
  'saya tulis ulang logika yang sama di dalam server Next.js: klasifikasi berbasis skor '
  'threshold dan prediksi tren dengan regresi linier sederhana. Dengan begitu, kapan pun '
  'dashboard dibuka hasil AI langsung tersedia. Alasan saya memilih pendekatan berbasis '
  'aturan untuk klasifikasi adalah karena hasilnya deterministik dan mudah dijelaskan, '
  'sementara untuk prediksi jangka pendek regresi linier sudah cukup dan sangat ringan."')
PB()

# ---------- 10. DASHBOARD ----------
H1("Bagian 9 - Dashboard Web Real-time (Slide 14)")
H2("Apa yang dikerjakan")
B("Header dengan badge LIVE/OFFLINE (dari timestamp data terakhir) dan timestamp update.")
B("Kartu sensor (Suhu, Kelembapan, Gas) dengan warna status dan label level gas "
  "(Good / Moderate / Poor / Hazardous).")
B("StatusBanner: NORMAL hijau / ALERT merah + daftar alasan.")
B("ActuatorCard: toggle interaktif Fan, Buzzer, LED merah/hijau; state 'menunggu ESP32' "
  "selama belum ada konfirmasi.")
B("TelemetryChart (Recharts): line chart tren temp/hum/gas 24 jam, auto-update.")
B("StatsPanel: avg/min/max + jumlah alert.", )
B("DataLog (riwayat pembacaan), AlertTable (log alert: jenis, pesan, nilai vs threshold).")
B("ML cards: klasifikasi AI + prediksi bacaan berikutnya.")
B("ThresholdCard: kalibrasi threshold + toggle auto-control (dijelaskan di Bagian 10).")
H2("Keputusan & alasan")
B("Polling terpusat di page dengan interval berbeda (latest 5 dtk, riwayat & statistik 10-15 "
  "dtk, AI 30 dtk) -- hemat request, tetap real-time.")
B("Semua kartu memakai pola visual konsisten (HUD) sehingga mudah dibedakan statusnya.")
B("Responsif penuh: grid auto-fit sehingga pada layar sempit kartu otomatis menjadi satu "
  "kolom, dan tabel bisa digeser horizontal.")
N("Narasi (kurang lebih 1 menit 30 detik):")
P('  "Dashboard-nya berupa satu halaman yang hidup. Ada kartu untuk tiap sensor dengan '
  'warna yang langsung menunjukkan kondisi, banner status normal atau alert, dan grafik '
  'tren dua puluh empat jam. Semua nilai ini diperbarui dengan polling -- data terbaru tiap '
  'lima detik, riwayat dan statistik tiap sepuluh sampai lima belas detik, dan hasil AI tiap '
  'tiga puluh detik. Saat alert terjadi, kartu dan banner berubah warna dan baris alert '
  'langsung muncul lengkap dengan nilai versus batasnya. Tampilannya saya buat responsif: '
  'di layar kecil semua kartu menumpuk jadi satu kolom tanpa ada yang terpotong."')
PB()

# ---------- 11. KALIBRASI THRESHOLD ----------
H1("Bagian 10 - Kalibrasi Threshold & Auto-Control dari Dashboard")
H2("Apa yang dikerjakan")
P("Membuat ThresholdCard di dashboard yang mengirim POST /api/settings. Server menyimpannya "
  "ke tabel settings dan langsung menjadikannya acuan computeStatus. ESP32 menarik nilai yang "
  "sama tiap 30 detik, sehingga kalibrasi dari dashboard berlaku juga di logika lokal (tanpa "
  "flash ulang).")
H2("Alasan desain")
B("Single source of truth di server: semua pihak (status server, alert, ML in-app, dan ESP32) "
  "memakai nilai yang sama.")
B("Toggle auto-control: kalau dimatikan, server tidak lagi mengantrekan perintah otomatis -- "
  "pengguna memegang kendali penuh. Firmware tetap punya grace period 15 detik untuk perintah "
  "manual.")
B("UI jujur terhadap sistem: tombol menunjukkan status 'menunggu ESP32' sampai perintah "
  "di-ACK, sehingga tidak membohongi pengguna.")
N("Narasi (kurang lebih 1 menit):")
P('  "Satu fitur yang saya rasa penting adalah kalibrasi threshold langsung dari dashboard. '
  'SP32 tidak perlu di-flash ulang ketika saya mengubah batas gas, suhu, atau kelembapan -- '
  'cukup ubah di kartu kalibrasi, server menyimpannya sebagai sumber kebenaran, dan dalam '
  'tiga puluh detik ESP32 ikut berubah. Saya juga menambahkan toggle auto-control; jika '
  'dimatikan, server berhenti mengeluarkan perintah otomatis sehingga pengguna bisa memegang '
  'kendali penuh. Dan seluruh status di dashboard itu jujur -- kalau lampu masih menunggu '
  'konfirmasi dari perangkat, ditampilkan sebagai sedang ditunggu."')
PB()

# ---------- 12. POLISH UI ----------
H1("Bagian 11 - Penyesuaian UI Agar Responsif & Konsisten")
H2("Apa yang dikerjakan")
B("Font: memakai font Geist bawaan Next.js, konsisten antar bagian.")
B("Pola HUD terpusat: .hud-panel, .hud-title, .hud-chip, .hud-note didefinisikan di "
  "@layer components supaya utility Tailwind masih bisa memodifikasinya (mis. border warna "
  "per status).")
B("Layout fleksibel: grid auto-fit (repeat(auto-fit, minmax(...))) -- jumlah kolom "
  "menyesuaikan ruang yang tersedia, bukan breakpoint kaku.")
B("Tipografi fluida: nilai sensor memakai clamp() sehingga ukuran teks mengikuti lebar "
  "layar dengan halus, tidak lompat-lompat.")
B("Tabel bisa digeser horizontal di layar kecil (overflow-auto + min-w) dengan scrollbar "
  "tipis.")
N("Narasi (kurang lebih 40 detik):")
P('  "Terakhir, saya merapikan tampilan supaya konsisten dan fleksibel. Semua kartu memakai '
  'pola visual yang sama, warna status bisa mengubah tepi kartu. Grid-nya saya buat '
  'menyesuaikan diri -- bukan lagi tiga kolom kaku, tapi kolom terbentuk sesuai ruang yang '
  'ada, jadi di tablet muncul dua kolom dan di ponsel satu kolom dengan ukuran teks yang '
  'ikut menyesuaikan."')
PB()

# ---------- 13. KELEBIHAN & DEMO ----------
H1("Bagian 12 - Kelebihan Sistem & Cara Menjalankan (Slide 16-17)")
H2("Kelebihan yang bisa ditekankan")
TB(
    ["Kelebihan", "Penjelasan"],
    [
        ["Offline-proof", "Alert lokal di ESP32 jalan walau WiFi/server mati"],
        ["Real-time", "Polling 5 detik; data muncul di dashboard cepat"],
        ["AI-powered", "Klasifikasi status + prediksi tren nilai sensor"],
        ["Threshold data-driven", "Batas ditentukan dari EDA data riil, bukan tebakan"],
        ["Kalibrasi tanpa flash", "Threshold & auto-control diubah dari dashboard, ESP32 ikut 30 detik"],
        ["Auto-discovery", "ESP32 menemukan server sendiri, tanpa ubah IP manual"],
        ["Satu project", "Dashboard + API + ML in-app cukup npm run dev"],
    ],
)
H2("Cara menjalankan (demo)")
P("1) Dashboard: cd smart-room-dashboard && npm install && npm run dev, buka "
  "http://localhost:3000.")
P("2) Firmware: upload smart_room_monitoring.ino via Arduino IDE (board ESP32); atur "
  "WIFI_SSID & WIFI_PASS; API_KEY harus sama dengan IOT_API_KEY di .env.local. Server "
  "ditemukan otomatis (auto-discovery); SERVER_HOST hanya fallback.")
P("3) Untuk kontrol dari laptop: pastikan HP/ESP32 dan laptop di jaringan yang sama.")
P("4) Demo: ubah threshold di dashboard lalu amati ESP32 ikut; matikan WiFi utk "
  "perlihatkan offline-proof (LED/buzzer tetap jalan).")
N("Narasi penutup (kurang lebih 1 menit):")
P('  "Jadi sistem ini punya beberapa keunggulan yang mau saya tekankan: alert tetap jalan '
  'saat internet mati, tampilan real-time, ada AI untuk klasifikasi dan prediksi, threshold '
  'yang berasal dari data riil, dan kalibrasi yang tidak butuh flash ulang. Supaya singkat, '
  'untuk demo saya cukup menjalankan npm run dev dan menyalakan ESP32 -- server langsung '
  'ditemukan dengan auto-discovery. Terima kasih, saya siap menerima pertanyaan."')
PB()

# ---------- 14. PENUTUP & REFERENSI ----------
H1("Bagian 13 - Penutup & Referensi (Slide 18)")
H2("Ringkasan yang disampaikan")
P("Dari sensor hingga dashboard, seluruh rantai dibuat lengkap: firmware ESP32 dengan "
  "logika lokal, backend Next.js dengan validasi & single source of truth, database SQLite, "
  "analisis data untuk threshold, integrasi AI, hingga dashboard real-time yang responsif "
  "dan memiliki kontrol aktuator.")
H2("Keterbatasan (jujur di depan penguji)")
B("Database SQLite berjalan di filesystem lokal -- untuk produksi cloud multi-user perlu "
  "Postgres/Supabase.")
B("Belum ada otentikasi multi-user; API key tunggal untuk perangkat.")
B("Prediksi hanya tren jangka pendek (5 menit in-app; 3 jam di Python); bukan model "
  "siklus penuh.")
B("Sensor DHT11 punya akurasi terbatas; untuk penelitian ketat bisa naik ke DHT22/AM2301B.")
H2("Referensi")
P("PRD (prd.md), Panduan PPT (docs/panduan_ppt.txt), dokumentasi Next.js App Router, "
  "Recharts, Zod, better-sqlite3, DHT11 datasheet, MQ-135 datasheet, scikit-learn Decision "
  "Tree, statsmodels ARIMA, ArduinoJson.")
PB()

# ---------- LAMPIRAN Q&A ----------
H1("Lampiran - Pertanyaan Umum & Jawaban Siap")
B("Q: Kenapa tidak memakai WebSocket?")
P('A: Interval data 10 detik; polling 5 detik sudah memenuhi kriteria "kurang dari 5 detik". '
  "Polling stateless lebih sederhana, mudah di-debug, dan tidak perlu menjaga koneksi yang "
  "bisa putus.")
B("Q: Kenapa SQLite, bukan Supabase?")
P("A: Data dari satu device, kebutuhan real-time sederhana, dan demo lokal. SQLite tanpa "
  "setup cloud, latensi nol, satu file. Untuk produksi multi-user tetap Supabase/Postgres.")
B("Q: Bagaimana threshold memengaruhi sistem?")
P("A: Threshold tersimpan di tabel settings (default gas 500, temp 32 C, hum 75%), dipakai "
  "computeStatus di server, disinkronkan ke ESP32 tiap 30 detik, dan dipakai klasifikasi AI. "
  "Jadi satu nilai yang sama dipakai seluruh sistem.")
B("Q: Kalau WiFi mati, apa yang terjadi?")
P("A: Logika lokal tetap jalan: ESP32 tetap mengevaluasi sensor dan menyalakan buzzer/LED/"
  "fan. Yang hilang hanya pencatatan ke server dan tampilan dashboard -- dashboard menandai "
  "OFFLINE setelah 30 detik tanpa data.")
B("Q: Bagaimana cara mengetahui klasifikasi AI akurat?")
P("A: Klasifikasi berbasis aturan + training Decision Tree dari data riil berlabel berbasis "
  "threshold hasil EDA. Confidence dihitung dari skor. Ini bukan klaim akurasi mutlak, "
  "melainkan interpretable dan deterministik.")
B("Q: Kenapa prediksi pakai regresi linier?")
P("A: Untuk tren jangka pendek (5 menit) regresi linier ringan, tanpa dependensi, dan mudah "
  "dijelaskan. Eksperimen jangka panjang memakai ARIMA di Python.")
B("Q: Apa langkah berikutnya?")
P("A: Kontrol penuh multi-device, notifikasi Telegram saat alert, otentikasi pengguna, dan "
  "sensor tambahan (LDR/PIR) seperti di backlog PRD.")


# ============================================================
# RENDERER DOCX
# ============================================================

def render_docx():
    from docx import Document
    from docx.shared import Pt, RGBColor, Inches
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from docx.oxml.ns import qn
    from docx.oxml import OxmlElement

    doc = Document()

    # gaya dasar
    normal = doc.styles["Normal"]
    normal.font.name = "Calibri"
    normal.font.size = Pt(10.5)

    for name, size, color, bold in [
        ("Heading 1", 15, "1E293B", True),
        ("Heading 2", 12.5, "334155", True),
        ("Heading 3", 11, "475569", True),
    ]:
        st = doc.styles[name]
        st.font.name = "Calibri"
        st.font.size = Pt(size)
        st.font.color.rgb = RGBColor.from_string(color)
        st.font.bold = bold
        st.paragraph_format.space_before = Pt(10)
        st.paragraph_format.space_after = Pt(4)

    def shade(p, fill):
        pr = p._p.get_or_add_pPr()
        shd = OxmlElement("w:shd")
        shd.set(qn("w:val"), "clear")
        shd.set(qn("w:fill"), fill)
        pr.append(shd)

    def add_code(text):
        for line in text.split("\n"):
            p = doc.add_paragraph()
            run = p.add_run(line)
            run.font.name = "Courier New"
            run.font.size = Pt(9)
            shade(p, "F1F5F9")
            p.paragraph_format.space_after = Pt(0)

    def add_table(header, rows):
        t = doc.add_table(rows=1, cols=len(header))
        t.style = "Light Grid Accent 1"
        hdr = t.rows[0].cells
        for i, h in enumerate(header):
            hdr[i].text = h
            for p in hdr[i].paragraphs:
                for r in p.runs:
                    r.font.bold = True
                    r.font.size = Pt(9.5)
        for row in rows:
            cells = t.add_row().cells
            for i, v in enumerate(row):
                cells[i].text = str(v)
                for p in cells[i].paragraphs:
                    for r in p.runs:
                        r.font.size = Pt(9)
        doc.add_paragraph()

    for kind, payload in I_CONTENT:
        if kind == "title":
            p = doc.add_paragraph()
            r = p.add_run(payload)
            r.font.size = Pt(20)
            r.font.bold = True
            r.font.color.rgb = RGBColor.from_string("0F172A")
            p.paragraph_format.space_after = Pt(2)
        elif kind == "h1":
            doc.add_heading(payload, level=1)
        elif kind == "h2":
            doc.add_heading(payload, level=2)
        elif kind == "h3":
            doc.add_heading(payload, level=3)
        elif kind == "p":
            p = doc.add_paragraph(payload)
            p.paragraph_format.space_after = Pt(4)
        elif kind == "bullet":
            p = doc.add_paragraph(payload, style="List Bullet")
            p.paragraph_format.space_after = Pt(2)
        elif kind == "bullet2":
            p = doc.add_paragraph(payload, style="List Bullet 2")
            p.paragraph_format.space_after = Pt(2)
        elif kind == "narasi":
            p = doc.add_paragraph()
            r = p.add_run(payload)
            r.font.italic = True
            r.font.color.rgb = RGBColor.from_string("0B4F8A")
            shade(p, "EAF2FD")
            p.paragraph_format.space_before = Pt(6)
            p.paragraph_format.space_after = Pt(6)
        elif kind == "code":
            add_code(payload)
        elif kind == "table":
            add_table(*payload)
        elif kind == "pagebreak":
            doc.add_page_break()

    doc.save(OUT_DOCX)
    print("OK docx ->", OUT_DOCX)


# ============================================================
# RENDERER PDF
# ============================================================

def render_pdf():
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.lib import colors
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Preformatted, Table, TableStyle,
        PageBreak, ListFlowable, ListItem,
    )
    from reportlab.lib.enums import TA_LEFT

    doc = SimpleDocTemplate(
        OUT_PDF, pagesize=A4,
        leftMargin=18 * mm, rightMargin=18 * mm,
        topMargin=16 * mm, bottomMargin=16 * mm,
        title="Smart Room IoT Monitoring - Panduan & Script Presentasi",
        author="Abdul Halim",
    )

    st = getSampleStyleSheet()
    S_TITLE = ParagraphStyle("T", parent=st["Title"], fontName="Helvetica-Bold",
                             fontSize=19, leading=23, textColor=colors.HexColor("#0F172A"))
    S_H1 = ParagraphStyle("H1", parent=st["Heading1"], fontName="Helvetica-Bold",
                          fontSize=14.5, leading=18, textColor=colors.HexColor("#1E293B"),
                          spaceBefore=12, spaceAfter=5)
    S_H2 = ParagraphStyle("H2", parent=st["Heading2"], fontName="Helvetica-Bold",
                          fontSize=12, leading=15, textColor=colors.HexColor("#334155"),
                          spaceBefore=9, spaceAfter=4)
    S_H3 = ParagraphStyle("H3", parent=st["Heading3"], fontName="Helvetica-Bold",
                          fontSize=10.5, leading=14, textColor=colors.HexColor("#475569"),
                          spaceBefore=7, spaceAfter=3)
    S_P = ParagraphStyle("P", parent=st["BodyText"], fontName="Helvetica",
                         fontSize=9.6, leading=13, alignment=TA_LEFT, spaceAfter=4)
    S_B = ParagraphStyle("B", parent=S_P, leftIndent=10, bulletIndent=2)
    S_B2 = ParagraphStyle("B2", parent=S_P, leftIndent=20, bulletIndent=12)
    S_N = ParagraphStyle("N", parent=S_P, italic=1, fontName="Helvetica-Oblique",
                         textColor=colors.HexColor("#0B4F8A"),
                         backColor=colors.HexColor("#EAF2FD"),
                         borderPadding=6, spaceBefore=6, spaceAfter=8)
    S_CODE = ParagraphStyle("C", parent=st["Code"], fontName="Courier",
                            fontSize=8, leading=10)
    S_SUB = ParagraphStyle("SU", parent=S_P, fontSize=8.6, leading=11,
                           textColor=colors.HexColor("#475569"), spaceAfter=14)

    def esc(t):
        return t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

    story = []

    def footer(canv, doc_):
        canv.saveState()
        canv.setFont("Helvetica", 7.5)
        canv.setFillColor(colors.HexColor("#64748B"))
        canv.drawString(18 * mm, 9 * mm,
                        "Smart Room IoT Monitoring - Panduan & Script Presentasi")
        canv.drawRightString(A4[0] - 18 * mm, 9 * mm, "Hal %d" % doc_.page)
        canv.restoreState()

    for kind, payload in I_CONTENT:
        if kind == "title":
            story.append(Paragraph(esc(payload), S_TITLE))
            story.append(Spacer(1, 4))
        elif kind == "h1":
            story.append(Paragraph(esc(payload), S_H1))
        elif kind == "h2":
            story.append(Paragraph(esc(payload), S_H2))
        elif kind == "h3":
            story.append(Paragraph(esc(payload), S_H3))
        elif kind == "p":
            story.append(Paragraph(esc(payload), S_P))
        elif kind == "bullet":
            story.append(Paragraph(esc(payload), S_B, bulletText="\u2022"))
        elif kind == "bullet2":
            story.append(Paragraph(esc(payload), S_B2, bulletText="\u2013"))
        elif kind == "narasi":
            story.append(Paragraph(esc(payload), S_N))
        elif kind == "code":
            story.append(Preformatted(payload, S_CODE))
        elif kind == "table":
            header, rows = payload
            data = [[Paragraph("<b>" + esc(h) + "</b>", S_P) for h in header]]
            for row in rows:
                data.append([Paragraph(esc(str(v)), S_P) for v in row])
            tbl = Table(data, hAlign="LEFT")
            tbl.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E2E8F0")),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#CBD5E1")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ]))
            story.append(tbl)
            story.append(Spacer(1, 6))
        elif kind == "pagebreak":
            story.append(PageBreak())

    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    print("OK pdf ->", OUT_PDF)


if __name__ == "__main__":
    render_docx()
    render_pdf()