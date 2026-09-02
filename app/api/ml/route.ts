import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") ?? "all";

    const result: Record<string, unknown> = { ok: true };

    if (type === "all" || type === "classifications") {
      const { data: classifications } = await supabase
        .from("ml_classifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      result.classifications = classifications ?? [];
    }

    if (type === "all" || type === "predictions") {
      const { data: predictions } = await supabase
        .from("ml_predictions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      result.predictions = predictions ?? [];
    }

    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 },
    );
  }
}
