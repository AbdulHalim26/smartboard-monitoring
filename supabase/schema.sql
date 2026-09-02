create table telemetry (
  id bigint generated always as identity primary key,
  device_id text not null default 'esp32-room-01',
  temperature numeric(5,2),
  humidity numeric(5,2),
  gas_value int,
  status text not null default 'NORMAL' check (status in ('NORMAL','ALERT')),
  fan_on boolean default false,
  buzzer_on boolean default false,
  led_red_on boolean default false,
  led_green_on boolean default false,
  created_at timestamptz not null default now()
);

create table alerts (
  id bigint generated always as identity primary key,
  telemetry_id bigint references telemetry(id) on delete cascade,
  device_id text not null,
  alert_type text not null check (alert_type in ('GAS','TEMP','HUM')),
  message text not null,
  value numeric,
  threshold numeric,
  created_at timestamptz not null default now()
);

create index idx_telemetry_created on telemetry (created_at desc);
create index idx_alerts_created on alerts (created_at desc);

-- enable realtime untuk tabel telemetry
alter publication supabase_realtime add table telemetry;
