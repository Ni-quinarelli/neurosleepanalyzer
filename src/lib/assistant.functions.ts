import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant", "system"]),
      content: z.string(),
    }),
  ),
  context: z.string().optional(),
});

export const chatWithAssistant = createServerFn({ method: "POST" })
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY ausente");

    const system = `Você é um neurocientista didático especializado em sono, EEG, EMG e ECoG.
Explique conceitos complexos (consolidação de memória, REM, ondas lentas, hipervigilância,
condicionamento de medo ao contexto - CMC) em linguagem simples e clara para estudantes
e pesquisadores. Sempre responda em português. Se houver contexto de análise do usuário,
interprete os números e relacione-os com a fisiologia do sono e formação de memórias.

${data.context ? `Contexto da análise atual do usuário:\n${data.context}` : ""}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: system }, ...data.messages],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`AI gateway: ${res.status} ${text.slice(0, 200)}`);
    }
    const json = await res.json();
    const reply = json?.choices?.[0]?.message?.content ?? "(sem resposta)";
    return { reply };
  });
