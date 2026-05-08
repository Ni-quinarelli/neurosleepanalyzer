import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/about")({
  component: AboutPage,
  head: () => ({
    meta: [
      { title: "Sobre — NeuroSleep Analytica" },
      {
        name: "description",
        content: "Sobre o analisador de sinais EEG/EMG NeuroSleep Analytica.",
      },
    ],
  }),
});

function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sobre</h1>
        <p className="text-sm text-muted-foreground">
          Como o analisador funciona e como utilizá-lo.
        </p>
      </div>

      <Card className="space-y-4 p-6 text-sm leading-relaxed">
        <section>
          <h2 className="mb-1 font-semibold">O que faz</h2>
          <p className="text-muted-foreground">
            Envie uma imagem com dois traçados fisiológicos empilhados (EEG em
            cima, EMG embaixo). Cada coluna de pixels é varrida em busca do
            ponto mais escuro para reconstruir a forma de onda. Variância,
            amplitude média e número de picos são calculados para cada sinal, e
            o estado é classificado como Sono de Ondas Lentas, Sono REM ou
            Vigília.
          </p>
        </section>
        <section>
          <h2 className="mb-1 font-semibold">Regras de classificação</h2>
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
            <li>
              Sono de Ondas Lentas — variância EEG &lt; limiar E amplitude EMG baixa
            </li>
            <li>Sono REM — variância EEG &gt; limiar E amplitude EMG muito baixa</li>
            <li>Vigília — amplitude EMG acima do limiar</li>
          </ul>
        </section>
        <section>
          <h2 className="mb-1 font-semibold">Privacidade</h2>
          <p className="text-muted-foreground">
            Todo o processamento ocorre no seu navegador. O histórico é
            armazenado localmente e nunca é enviado para um servidor.
          </p>
        </section>
      </Card>
    </div>
  );
}
