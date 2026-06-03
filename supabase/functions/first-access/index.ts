import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, code, password } = await req.json();

    if (!email || !code || !password) {
      return new Response(JSON.stringify({ error: "Email, código e senha são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (password.length < 6) {
      return new Response(JSON.stringify({ error: "A senha deve ter no mínimo 6 caracteres" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Busca o código — sem depender de listUsers (evita problema de paginação)
    const { data: codeData, error: codeError } = await adminClient
      .from("first_access_codes")
      .select("id, user_id")
      .eq("code", code.toUpperCase().trim())
      .eq("used", false)
      .maybeSingle();

    if (codeError || !codeData) {
      return new Response(JSON.stringify({ error: "Email ou código inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verifica se o email bate com o usuário dono do código
    const { data: { user }, error: getUserError } = await adminClient.auth.admin.getUserById(codeData.user_id);

    if (getUserError || !user || user.email?.toLowerCase() !== email.toLowerCase().trim()) {
      return new Response(JSON.stringify({ error: "Email ou código inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Atualiza a senha
    const { error: updateError } = await adminClient.auth.admin.updateUserById(user.id, {
      password,
    });

    if (updateError) {
      return new Response(JSON.stringify({ error: "Erro ao definir senha. Tente novamente." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Marca o código como usado
    await adminClient
      .from("first_access_codes")
      .update({ used: true })
      .eq("id", codeData.id);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: "Erro interno do servidor" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
