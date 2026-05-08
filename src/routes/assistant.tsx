import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { chatWithAssistant } from "@/lib/assistant.functions";
import { loadHistory } from "@/utils/history";

export const Route = createFileRoute("/assistant")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Assistente IA — NeuroSleep Analytica" },
      { name: "description", content: "Assistente que explica seus dados neurofisiológicos do sono em linguagem simples." },
    ],
  }),
});

interface Msg { role: "user" | "assistant"; content: string }

function Page() {
  const callAI = useServerFn(chatWithAssistant);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Olá! Posso explicar seus padrões de sono, REM, ondas lentas, ECoG e o condicionamento de medo (CMC). Pergunte algo ou peça uma interpretação da sua última análise.",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  const buildContext = () => {
    const h = loadHistory().slice(0, 3);
    if (!h.length) return "";
    return h
      .map((e) => {
        if (e.type === "eeg-emg") {
          return `[EEG/EMG ${new Date(e.date).toLocaleString("pt-BR")}] classificação=${e.classification}, var EEG=${e.eeg.variance.toFixed(4)}, amp EMG=${e.emg.meanAmplitude.toFixed(4)}, picos=${e.eeg.peakCount}/${e.emg.peakCount}`;
        }
        return `[ECoG ${new Date(e.date).toLocaleString("pt-BR")}] padrão=${e.channelA.memoryPattern}, consolidação=${(e.channelA.consolidationScore * 100).toFixed(0)}%, CMC=${e.channelA.cmcReferenceLevel} (freezing ~${e.channelA.cmcFreezingEstimate}%)`;
      })
      .join("\n");
  };

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const r = await callAI({
        data: { messages: next, context: buildContext() },
      });
      setMessages((m) => [...m, { role: "assistant", content: r.reply }]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `Erro: ${e instanceof Error ? e.message : "falha"}` },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-3rem)] max-w-3xl flex-col px-6 py-6">
      <div className="mb-4">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Sparkles className="h-5 w-5 text-primary" /> Assistente IA
        </h1>
        <p className="text-sm text-muted-foreground">
          Explica em linguagem simples seus dados de EEG, EMG e ECoG. Usa o histórico recente como contexto.
        </p>
      </div>

      <Card className="flex flex-1 flex-col overflow-hidden p-0">
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                m.role === "user"
                  ? "ml-auto bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}
            >
              {m.content}
            </div>
          ))}
          {busy && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Pensando…
            </div>
          )}
          <div ref={endRef} />
        </div>
        <div className="flex gap-2 border-t border-border p-3">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Pergunte algo sobre o sono, ECoG, CMC ou seus dados…"
            rows={2}
            className="resize-none"
          />
          <Button onClick={send} disabled={busy || !input.trim()} className="self-end gap-1.5">
            <Send className="h-4 w-4" /> Enviar
          </Button>
        </div>
      </Card>
    </div>
  );
}
