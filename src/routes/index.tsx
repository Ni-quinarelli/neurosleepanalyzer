import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, Brain, Sparkles, History, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "NeuroSleep Analytica" },
      {
        name: "description",
        content:
          "Análise de sinais EEG, EMG e ECoG com identificação de padrões de memória traumática.",
      },
    ],
  }),
});

const tiles = [
  {
    to: "/eeg-emg",
    title: "Análise EEG/EMG",
    desc: "Anexe imagens separadas de EEG e EMG para classificar o estado de sono.",
    icon: Activity,
  },
  {
    to: "/ecog",
    title: "Análise ECoG",
    desc: "Padrões de memória traumática e escala de referência CMC.",
    icon: Brain,
  },
  {
    to: "/assistant",
    title: "Assistente IA",
    desc: "Explica em linguagem simples seus dados neurofisiológicos do sono.",
    icon: Sparkles,
  },
  {
    to: "/history",
    title: "Histórico",
    desc: "Análises anteriores com gráficos comparativos.",
    icon: History,
  },
] as const;

function Home() {
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-6 py-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">NeuroSleep Analytica</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Plataforma de análise de imagens fisiológicas para estudos de sono. O{" "}
          <strong>ECoG</strong> permite visualizar a atividade cortical envolvida na{" "}
          formação e recuperação de memórias traumáticas, e o{" "}
          <strong>CMC (Condicionamento de Medo ao Contexto)</strong> oferece a escala de
          referência teórica para o comportamento associado.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {tiles.map((t) => (
          <Link key={t.to} to={t.to} className="group">
            <Card className="flex h-full items-start gap-4 p-5 transition-colors group-hover:border-primary">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <t.icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{t.title}</h3>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{t.desc}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
