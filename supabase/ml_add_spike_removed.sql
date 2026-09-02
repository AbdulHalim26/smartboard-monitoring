-- Tambahkan kolom spike_removed ke tabel ml_classifications (jika belum ada)
alter table ml_classifications add column if not exists spike_removed boolean not null default false;
