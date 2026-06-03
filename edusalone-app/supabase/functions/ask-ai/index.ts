// ============================================================
// EduSalone AI Assistant — secure proxy (Supabase Edge Function)
// File path in your project: supabase/functions/ask-ai/index.ts
// ============================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const { question, context } = await req.json().catch(() => ({}));

    if (!question || typeof question !== "string" || !question.trim()) {
      return json({ error: "Please type a question." }, 400);
    }
    if (question.length > 2000) {
      return json({ error: "That question is too long. Keep it under 2000 characters." }, 400);
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");

    if (!apiKey) {
      return json({
        answer:
          "🤖 The EduSalone AI Assistant is being activated and will be available very soon. Please check back shortly!",
        activated: false,
      });
    }

    const systemPrompt =
      "You are EduSalone AI, a warm, encouraging study tutor for students in Sierra Leone. " +
      "You help with the BECE and WASSCE/WAEC curriculum across all subjects (Maths, English, " +
      "Sciences, Social Studies, and more). Explain clearly, simply, and step by step at a " +
      "secondary-school level. Keep answers concise and well organised, and use examples relevant " +
      "to Sierra Leone where it helps. Always encourage the student. If a question is not about " +
      "learning or schoolwork, gently guide them back to their studies. Help students truly " +
      "understand — never simply hand over exam answers to be copied dishonestly.";

    const userContent =
      context && typeof context === "string" ? `${context}\n\nQuestion: ${question}` : question;

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: "user", content: userContent }],
      }),
    });

    if (!resp.ok) {
      const detail = await resp.text();
      console.error("Anthropic API error", resp.status, detail);
      return json({ error: "The AI is busy right now. Please try again in a moment." }, 502);
    }

    const data = await resp.json();
    const answer =
      (data.content || [])
        .filter((b: any) => b.type === "text")
        .map((b: any) => b.text)
        .join("\n")
        .trim() || "Sorry, I couldn't form an answer. Please try rephrasing your question.";

    return json({ answer, activated: true });
  } catch (e) {
    console.error("ask-ai error", e);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
});