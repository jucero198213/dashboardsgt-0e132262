import { supabase } from "@/integrations/supabase/client";

export type LoginEvent = "login_success" | "login_failed" | "logout" | "password_changed";

export type LoginHistoryRow = {
  id: string;
  user_id: string | null;
  event: LoginEvent;
  email: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};

export const LOGIN_EVENT_LABEL: Record<LoginEvent, string> = {
  login_success: "Login realizado",
  login_failed: "Tentativa falhada",
  logout: "Logout",
  password_changed: "Senha alterada",
};

export async function registrarEventoLogin(
  event: LoginEvent,
  email: string,
  userId?: string | null,
): Promise<void> {
  const { error } = await supabase.from("login_history").insert({
    user_id: userId ?? null,
    event,
    email,
    user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
  } as never);
  if (error) console.error("registrarEventoLogin falhou:", event, error);
}

export async function listarHistoricoLogin(limit = 50): Promise<LoginHistoryRow[]> {
  const { data, error } = await supabase
    .from("login_history")
    .select("id, user_id, event, email, ip_address, user_agent, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("listarHistoricoLogin falhou:", error);
    return [];
  }
  return (data ?? []) as LoginHistoryRow[];
}

/** Resume o user agent para algo legível (navegador + sistema). */
export function resumirUserAgent(ua: string | null): string {
  if (!ua) return "Dispositivo desconhecido";
  const browser =
    /Edg\//.test(ua) ? "Edge" :
    /OPR\//.test(ua) ? "Opera" :
    /Chrome\//.test(ua) ? "Chrome" :
    /Safari\//.test(ua) ? "Safari" :
    /Firefox\//.test(ua) ? "Firefox" : "Navegador";
  const os =
    /Windows/.test(ua) ? "Windows" :
    /Android/.test(ua) ? "Android" :
    /(iPhone|iPad|iOS)/.test(ua) ? "iOS" :
    /Mac OS X/.test(ua) ? "macOS" :
    /Linux/.test(ua) ? "Linux" : "";
  return os ? `${browser} · ${os}` : browser;
}
