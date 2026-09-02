import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const PLACEHOLDER_PATTERNS = [/xxxx\.supabase\.co/i, /eyJ\.\.\./i, /<anon/i];
const isPlaceholder = (v: string | undefined) =>
  Boolean(v && PLACEHOLDER_PATTERNS.some((re) => re.test(v)));

const isConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    !isPlaceholder(supabaseUrl) &&
    !isPlaceholder(supabaseAnonKey),
);

declare global {
  var __supabase: SupabaseClient | undefined;
}

function makeClient(): SupabaseClient {
  if (typeof window !== "undefined") {
    return createClient(supabaseUrl ?? "", supabaseAnonKey ?? "");
  }
  if (globalThis.__supabase) return globalThis.__supabase;
  const client = createClient(supabaseUrl ?? "", supabaseAnonKey ?? "");
  globalThis.__supabase = client;
  return client;
}

export const supabase: SupabaseClient | null = isConfigured
  ? makeClient()
  : null;

export { isConfigured };