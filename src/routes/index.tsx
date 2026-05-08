import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Activity, Download } from "lucide-react";
import { UploadZone } from "@/components/UploadZone";
import { SignalChart } from "@/components/SignalChart";
import { MetricsTable } from "@/components/MetricsTable";
import { ClassificationBadge } from "@/components/ClassificationBadge";
import { ParameterPanel } from "@/components/ParameterPanel";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { extractSignalsFromImage, type ExtractedSignals } from "@/utils/imageProcessor";
import {
  classify,
  classificationToBinary,
  computeMetrics,
  defaultThresholds,
  type Thresholds,
} from "@/utils/signalAnalysis";
import { exportCSV } from "@/utils/csvExport";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Sleep Signal Analyzer" },
      {
        name: "description",
        content:
          "Analyze EEG and EMG sleep signal images: variance, amplitude, peaks, and automatic classification.",
      },
    ],
  }),
});

function Index() {
  const [imageURL, setImageURL] = useState<string | null>(null);
  const [signals, setSignals] = useState<ExtractedSignals | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [thresholds, setThresholds] = useState<Thresholds>(defaultThresholds);

  useEffect(() => () => { if (imageURL) URL.revokeObjectURL(imageURL); }, [imageURL]);

  const handleFile = async (file: File) => {
    setBusy(true);
    setWarning(null);
    if (imageURL) URL.revokeObjectURL(imageURL);
    setImageURL(URL.createObjectURL(file));
    try {
      const res = await extractSignalsFromImage(file);
      setSignals(res);
      const eegRange = Math.max(...res.eeg) - Math.min(...res.eeg);
      if (eegRange < 0.05) setWarning("Image appears uniform — extraction may be unreliable.");
    } catch {
      setWarning("Failed to process image.");
    } finally {
      setBusy(false);
    }
  };

  const result = useMemo(() => {
    if (!signals) return null;
    const eeg = computeMetrics(signals.eeg, thresholds.peakSensitivity);
    const emg = computeMetrics(signals.emg, thresholds.peakSensitivity);
    const c = classify(eeg, emg, thresholds);
    return { eeg, emg, classification: c, binary: classificationToBinary(c) };
  }, [signals, thresholds]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-4">
          <Activity className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold tracking-tight">Sleep Signal Analyzer</h1>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        {!signals && (
          <div className="mx-auto max-w-2xl">
            <UploadZone onFile={handleFile} />
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Upload a polysomnography-style image with EEG (top) and EMG (bottom).
            </p>
          </div>
        )}

        {busy && (
          <p className="text-center text-sm text-muted-foreground">Processing image…</p>
        )}

        {warning && (
          <div className="rounded-md border border-orange-300 bg-orange-50 p-3 text-sm text-orange-900">
            {warning}
          </div>
        )}

        {signals && result && imageURL && (
          <div className="animate-in fade-in space-y-6 duration-500">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="overflow-hidden p-4">
                <p className="mb-2 font-mono text-xs text-muted-foreground">Original image</p>
                <img src={imageURL} alt="Uploaded signal" className="w-full rounded border border-border" />
                <div className="mt-3">
                  <UploadZone onFile={handleFile} />
                </div>
              </Card>

              <Card className="space-y-4 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Classification</p>
                  <ClassificationBadge value={result.classification} />
                </div>
                <SignalChart data={signals.eeg} color="hsl(220 70% 45%)" label="EEG" />
                <SignalChart data={signals.emg} color="hsl(15 70% 45%)" label="EMG" />
              </Card>
            </div>

            <Card className="p-4">
              <p className="mb-3 text-sm font-medium">Signal metrics</p>
              <MetricsTable eeg={result.eeg} emg={result.emg} />
            </Card>

            <Card className="p-4">
              <p className="mb-3 text-sm font-medium">Binary output</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-mono">Sono_ondas_lentas</TableHead>
                    <TableHead className="font-mono">REM</TableHead>
                    <TableHead className="font-mono">Vigilia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-mono">{result.binary.Sono_ondas_lentas}</TableCell>
                    <TableCell className="font-mono">{result.binary.REM}</TableCell>
                    <TableCell className="font-mono">{result.binary.Vigilia}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Card>

            <ParameterPanel thresholds={thresholds} onChange={setThresholds} />

            <div className="flex justify-end">
              <Button
                onClick={() => exportCSV(result.eeg, result.emg, result.classification)}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Download CSV
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
