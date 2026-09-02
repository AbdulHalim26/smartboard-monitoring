"use client";

import { useEffect, useState } from "react";

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

/**
 * Jam digital live yang memperbarui nilai setiap detik.
 * Komponen terpisah agar re-render tidak membebani seluruh dashboard.
 */
export function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    const immediate = setTimeout(tick, 0);
    const t = setInterval(tick, 1000);
    return () => {
      clearTimeout(immediate);
      clearInterval(t);
    };
  }, []);

  if (!now) {
    // Nilai placeholder konsisten di server & client saat hydration
    return <span className="tnum">--:--:--</span>;
  }

  const h = pad(now.getHours());
  const m = pad(now.getMinutes());
  const s = pad(now.getSeconds());
  const date = now.toLocaleDateString("id-ID", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });

  return (
    <span className="tnum">
      {date} · {h}:{m}:<span className="text-cyan-300">{s}</span>
    </span>
  );
}
