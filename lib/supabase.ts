import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
import { Database } from "@/supabase/database.types";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

const isReactNative =
  typeof navigator !== "undefined" && navigator.product === "ReactNative";
const isBrowser = typeof window !== "undefined" && !isReactNative;

// Create client with environment-specific storage
function createSupabaseClient() {
  if (isReactNative) {
    // Dynamically require AsyncStorage to avoid referencing `window` during SSR
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const AsyncStorage =
      require("@react-native-async-storage/async-storage").default;

    return createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }

  if (isBrowser) {
    // Browser: rely on localStorage automatically detected by Supabase
    return createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }

  // Server-side (SSR / Node.js): disable session persistence
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

export const supabase = createSupabaseClient();