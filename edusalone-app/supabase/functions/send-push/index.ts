// Sends an Expo push when a new EduChat message is inserted.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const payload = await req.json();
    const message = payload.record ?? payload;
    const receiverId = message?.receiver_id;

    if (!receiverId) {
      return new Response(JSON.stringify({ skipped: "no receiver_id" }), {
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: user } = await supabase
      .from("users")
      .select("push_token")
      .eq("id", receiverId)
      .single();

    const token = user?.push_token;
    if (!token) {
      return new Response(JSON.stringify({ skipped: "no push_token" }), {
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    const { count } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("receiver_id", receiverId)
      .eq("is_read", false);

    const pushMessage = {
      to: token,
      sound: "default",
      title: "📩 New message",
      body: "You have a new message. Open EduSalone to read it.",
      badge: count ?? 1,
      data: { type: "chat" },
    };

    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
      },
      body: JSON.stringify(pushMessage),
    });

    const result = await res.json();
    return new Response(JSON.stringify({ sent: true, result }), {
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  } catch (e) {
    console.error("send-push error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
});