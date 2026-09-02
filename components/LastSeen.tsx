"use client";

import { useEffect, useState } from "react";

/**
 * Menampilkan "X dtk lalu" sejak ts, diperbarui setiap detik.
 * ts = epoch ms. Nilai null → belum ada data.
 */
export function LastSeen({ ts }: { ts: number | null }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const immediate = setTimeout(tick, 0);
    const t = setInterval(tick, 1000);
    return () => {
      clearTimeout(immediate);
      clearInterval(t);
    };
  }, [ts]);

  if (ts === null) return null;

  const elapsedSec = now ? Math.max(0, Math.floor((now - ts) / 1000)) : 0;

  let label: string;
  if (elapsedSec < 5) label = "baru saja";
  else if (elapsedSec < 60) label = `${elapsedSec} dtk lalu`;
  else if (elapsedSec < 3600) label = `${Math.floor(elapsedSec / 60)} mnt lalu`;
  else label = `${Math.floor(elapsedSec / 3600)} jam lalu`;

  return (
    <span className="tnum text-slate-400">
      <span className="text-slate-500">· </span>
      {label}
    </span>
  );
}
