import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Trash2, FileText, Download, ImageOff } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClassificationBadge } from "@/components/ClassificationBadge";
import {
  clearHistory,
  deleteEntry,
  loadHistory,
  type HistoryEntry,
} from "@/utils/history";
import { exportPDF } from "@/utils/pdfExport";
import { exportCSV } from "@/utils/csvExport";

export const Route = createFileRoute("/history")({
  component: HistoryPage,
  head: () => ({
    meta: [
      { title: "Histórico — NeuroSleep Analytica" },
      { name: "description", content: "Análises anteriores de sinais do sono." },
    ],
  }),
});

function HistoryPage() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    setEntries(loadHistory());
  }, []);

  const refresh = () => setEntries(loadHistory());

  const handleDelete = (id: string) => {
    deleteEntry(id);
    refresh();
  };

  const handleClear = () => {
    if (confirm("Limpar todo o histórico?")) {
      clearHistory();
      refresh();
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Histórico</h1>
          <p className="text-sm text-muted-foreground">
            As análises recentes ficam armazenadas localmente neste dispositivo.
          </p>
        </div>
        {entries.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleClear} className="gap-2">
            <Trash2 className="h-4 w-4" />
            Limpar tudo
          </Button>
        )}
      </div>

      {entries.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-2 p-12 text-center">
          <ImageOff className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Nenhuma análise ainda.</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {entries.map((e) => (
            <Card key={e.id} className="space-y-3 overflow-hidden p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{e.filename}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(e.date).toLocaleString("pt-BR")}
                  </p>
                </div>
                <ClassificationBadge value={e.classification} />
              </div>
              <img
                src={e.thumbnail}
                alt={e.filename}
                className="w-full rounded border border-border"
              />
              <div className="grid grid-cols-3 gap-2 font-mono text-xs">
                <Metric label="Var EEG" value={e.eeg.variance.toFixed(4)} />
                <Metric label="Amp EMG" value={e.emg.meanAmplitude.toFixed(4)} />
                <Metric label="Picos" value={`${e.eeg.peakCount}/${e.emg.peakCount}`} />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() =>
                    exportPDF({
                      filename: e.filename,
                      thumbnail: e.thumbnail,
                      eeg: e.eeg,
                      emg: e.emg,
                      classification: e.classification,
                      date: new Date(e.date).toLocaleString("pt-BR"),
                    })
                  }
                >
                  <FileText className="h-3.5 w-3.5" /> PDF
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => exportCSV(e.eeg, e.emg, e.classification)}
                >
                  <Download className="h-3.5 w-3.5" /> CSV
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-auto gap-1.5 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(e.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Excluir
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-border bg-muted/30 p-2">
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="text-foreground">{value}</p>
    </div>
  );
}
