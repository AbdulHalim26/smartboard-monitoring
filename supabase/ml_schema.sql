-- ============================================================
--  ML/AI Tables — Smart Room Monitoring
--  Hasil klasifikasi (Decision Tree) & prediksi tren (ARIMA)
--  dijalankan dari Python backend, ditampilkan di dashboard.
-- ============================================================

-- Klasifikasi status dari Decision Tree
create table if not exists ml_classifications (
  id bigint generated always as identity primary key,
  timestamp timestamptz not null default now(),
  temperature numeric(5,2),
  humidity numeric(5,2),
  gas_value int,
  predicted_status text not null check (predicted_status in ('NORMAL','WASPADA','BAHAYA')),
  confidence numeric(5,4) not null default 0,
  spike_removed boolean not null default false,
  created_at timestamptz not null default now()
);

-- Prediksi tren per jam dari ARIMA
create table if not exists ml_predictions (
  id bigint generated always as identity primary key,
  timestamp timestamptz not null default now(),
  target_timestamp timestamptz not null,
  column_name text not null check (column_name in ('temperature','humidity','gas_value')),
  predicted_value numeric(8,2) not null,
  model_type text not null default 'ARIMA',
  created_at timestamptz not null default now()
);

create index if not exists idx_ml_classifications_created on ml_classifications (created_at desc);
create index if not exists idx_ml_predictions_created on ml_predictions (created_at desc);

-- Enable RLS + anon read policies
alter table ml_classifications enable row level security;
alter table ml_predictions enable row level security;

-- Dashboard boleh baca hasil ML
create policy "ml_classifications read anyone" on ml_classifications
  for select using (true);
create policy "ml_predictions read anyone" on ml_predictions
  for select using (true);

-- Python backend boleh insert
create policy "ml_classifications insert esp32" on ml_classifications
  for insert with check (true);
create policy "ml_predictions insert esp32" on ml_predictions
  for insert with check (true);

-- Enable realtime supaya dashboard update live
alter publication supabase_realtime add table ml_classifications;
alter publication supabase_realtime add table ml_predictions;