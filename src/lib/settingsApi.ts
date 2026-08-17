import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/lib/activityLogApi";

export type AppSetting = {
  key: string;
  value: unknown;
  description: string | null;
  updated_at: string;
  updated_by: string | null;
};

export async function getSetting<T = unknown>(key: string): Promise<T | null> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (error) {
    console.error("getSetting falhou:", key, error);
    return null;
  }
  return (data?.value ?? null) as T | null;
}

export async function getSettings(): Promise<Record<string, unknown>> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("key, value");
  if (error) {
    console.error("getSettings falhou:", error);
    return {};
  }
  return Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
}

export async function getSettingsMeta(): Promise<AppSetting[]> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("key, value, description, updated_at, updated_by");
  if (error) {
    console.error("getSettingsMeta falhou:", error);
    return [];
  }
  return (data ?? []) as AppSetting[];
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("app_settings")
    .upsert(
      {
        key,
        value: value as never,
        updated_at: new Date().toISOString(),
        updated_by: userData.user?.id ?? null,
      } as never,
      { onConflict: "key" }
    );
  if (error) {
    console.error("setSetting falhou:", key, error);
    throw error;
  }
  logActivity("settings_changed", `Alterou configuração: ${key}`, { key }).catch(() => {});
}
