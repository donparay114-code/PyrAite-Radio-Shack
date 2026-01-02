import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Check if we have valid Supabase configuration
const hasValidConfig = Boolean(supabaseUrl && supabaseAnonKey);

// Create client only if we have valid config, otherwise create a mock placeholder
// This allows builds to succeed without env vars while features work at runtime
let supabase: SupabaseClient;

if (hasValidConfig) {
  supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });
} else {
  // In development or build without env vars, warn and create a placeholder
  if (typeof window !== "undefined") {
    console.warn(
      "Supabase environment variables not set. Realtime features will be disabled."
    );
  }

  // Create a dummy client with placeholder URL to avoid build errors
  // This client won't actually work but prevents build-time crashes
  supabase = createClient(
    "https://placeholder.supabase.co",
    "placeholder-key",
    {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    }
  );
}

export { supabase };
export const isSupabaseConfigured = hasValidConfig;

export type ChatMessage = {
  id: number;
  user_id: number | null;
  content: string;
  message_type: "text" | "system" | "now_playing" | "request_approved" | "milestone";
  reply_to_id: number | null;
  is_deleted: boolean;
  deleted_by_id: number | null;
  deleted_at: string | null;
  delete_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type RealtimePayload<T> = {
  commit_timestamp: string;
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: T;
  old: Partial<T>;
  schema: string;
  table: string;
};
