import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/about")({
  component: AboutPage,
  head: () => ({
    meta: [
      { title: "About — NeuroSleep Analytica" },
      {
        name: "description",
        content: "About the NeuroSleep Analytica EEG/EMG analyzer.",
      },
    ],
  }),
});

function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">About</h1>
        <p className="text-sm text-muted-foreground">
          How the analyzer works and how to use it.
        </p>
      </div>

      <Card className="space-y-4 p-6 text-sm leading-relaxed">
        <section>
          <h2 className="mb-1 font-semibold">What it does</h2>
          <p className="text-muted-foreground">
            Upload an image with two stacked physiological traces (EEG on top,
            EMG on bottom). Each column of pixels is scanned for the darkest
            point to reconstruct the waveform. Variance, mean amplitude and peak
            count are computed for each signal, and the state is classified as
            Slow-Wave Sleep, REM or Wakefulness.
          </p>
        </section>
        <section>
          <h2 className="mb-1 font-semibold">Classification rules</h2>
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
            <li>Slow-Wave Sleep — EEG variance &lt; threshold AND EMG amplitude low</li>
            <li>REM — EEG variance &gt; threshold AND EMG amplitude very low</li>
            <li>Wakefulness — EMG amplitude above threshold</li>
          </ul>
        </section>
        <section>
          <h2 className="mb-1 font-semibold">Privacy</h2>
          <p className="text-muted-foreground">
            All processing happens in your browser. History is stored locally
            and never uploaded to a server.
          </p>
        </section>
      </Card>
    </div>
  );
}
