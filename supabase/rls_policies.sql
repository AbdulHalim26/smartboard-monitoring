-- ============================================================
--  RLS POLICIES — Smart Room Monitoring
--  Supabase project baru mengaktifkan RLS (tanpa policy) secara
--  default. Tanpa policy ini, POST /api/telemetry (dari ESP32)
--  dan pembacaan dashboard akan ditolak (500 / data tidak tampil).
--  Jalankan semua statement di SQL Editor.
-- ============================================================

-- Dashboard / browser: boleh membaca data
alter table telemetry enable row level security;
alter table alerts enable row level security;

create policy "telemetry read anyone" on telemetry
  for select using (true);

create policy "alerts read anyone" on alerts
  for select using (true);

-- Ingest ESP32: boleh insert telemetry (melalui API + API key)
create policy "telemetry insert esp32" on telemetry
  for insert with check (true);

-- Side-effect alert: boleh insert alerts (melalui API + API key)
create policy "alerts insert esp32" on alerts
  for insert with check (true);