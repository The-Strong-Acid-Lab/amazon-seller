import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      `Supabase server env is missing. NEXT_PUBLIC_SUPABASE_URL=${Boolean(
        url,
      )}, NEXT_PUBLIC_SUPABASE_ANON_KEY=${Boolean(anonKey)}`,
    );
  }

  return createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Components may not be able to set cookies.
          }
        },
      },
    },
  );
}

export async function getAuthenticatedUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    if (error.message === "Auth session missing!") {
      return null;
    }

    throw new Error(error.message);
  }

  return user;
}

export function createAdminSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      `Supabase admin env is missing. NEXT_PUBLIC_SUPABASE_URL=${Boolean(
        url,
      )}, SUPABASE_SERVICE_ROLE_KEY=${Boolean(serviceRoleKey)}`,
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
