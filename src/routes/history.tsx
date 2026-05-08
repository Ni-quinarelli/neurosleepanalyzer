import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Trash2, Download, FileText, ImageOff, Activity, Brain } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid,
} from "recharts";
import { ClassificationBadge } from "@/components/ClassificationBadge";
import {
  clearHistory, deleteEntry, loadHistory,
  type HistoryEntry, type EEGEMGEntry, type ECoGEntry,
} from "@/utils/history";
import { exportPDF } from "@/utils/pdfExport";
import { exportCSV, exportECoGCSV } from "@/utils/csvExport";

export const Route = createFileRoute("/history")({
  component: HistoryPage,
  head: () => ({
    meta: [
      { title: "Histórico — NeuroSleep Analytica" },
      { name: "description", content: "Análises anteriores com gráficos comparativos." },
    ],
  }),
});

function HistoryPage() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);

  useEffect(() => { setEntries(loadHistory()); }, []);
  const refresh = () => setEntries(loadHistory());
  const handleDelete = (id: string) => { deleteEntry(id); refresh(); };
  const handleClear = () => {
    if (confirm("Limpar todo o histórico?")) { clearHistory(); refresh(); }
  };

  const eegEmg = entries.filter((e): e is EEGEMGEntry => e.type === "eeg-emg");
  const ecog = entries.filter((e): e is ECoGEntry => e.type === "ecog");

  const eegEmgChart = useMemo(() => eegEmg.slice(0, 10).reverse().map((e, i) => ({
    name: `#${i + 1}`,
    "Variância EEG": Number(e.eeg.variance.toFixed(4)),
    "Amplitude EMG": Number(e.emg.meanAmplitude.toFixed(4)),
  })), [eegEmg]);

  const ecogChart = useMemo(() => ecog.slice(0, 10).reverse().map((e, i) => ({
    name: `#${i + 1}`,
    "Consolidação (%)": Math.round(e.channelA.consolidationScore * 100),
    "Freezing CMC (%)": e.channelA.cmcFreezingEstimate,
  })), [ecog]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Histórico</h1>
          <p className="text-sm text-muted-foreground">
            Análises anteriores de EEG/EMG e ECoG armazenadas localmente.
          </p>
        </div>
        {entries.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleClear} className="gap-2">
            <Trash2 className="h-4 w-4" /> Limpar tudo
          </Button>
        )}
      </div>

      {entries.length === 0 && (
        <Card className="flex flex-col items-center justify-center gap-2 p-12 text-center">
          <ImageOff className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Nenhuma análise ainda.</p>
        </Card>
      )}

      {(eegEmgChart.length > 0 || ecogChart.length > 0) && (
        <div className="grid gap-4 lg:grid-cols-2">
          {eegEmgChart.length > 0 && (
            <Card className="p-4">
              <p className="mb-3 text-sm font-medium">Comparativo EEG/EMG</p>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={eegEmgChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="Variância EEG" fill="hsl(220 70% 45%)" />
                    <Bar dataKey="Amplitude EMG" fill="hsl(15 70% 45%)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}
          {ecogChart.length > 0 && (
            <Card className="p-4">
              <p className="mb-3 text-sm font-medium">Comparativo ECoG (Consolidação vs CMC)</p>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ecogChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="Consolidação (%)" fill="hsl(265 60% 50%)" />
                    <Bar dataKey="Freezing CMC (%)" fill="hsl(0 70% 50%)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {entries.map((e) =>
          e.type === "eeg-emg" ? (
            <EEGCard key={e.id} entry={e} onDelete={handleDelete} />
          ) : (
            <ECoGCard key={e.id} entry={e} onDelete={handleDelete} />
          ),
        )}
      </div>
    </div>
  );
}

function EEGCard({ entry: e, onDelete }: { entry: EEGEMGEntry; onDelete: (id: string) => void }) {
  return (
    <Card className="space-y-3 overflow-hidden p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs uppercase text-muted-foreground">
            <Activity className="h-3 w-3" /> EEG/EMG
          </p>
          <p className="truncate text-sm font-medium">{e.filename}</p>
          <p className="text-xs text-muted-foreground">{new Date(e.date).toLocaleString("pt-BR")}</p>
        </div>
        <ClassificationBadge value={e.classification} />
      </div>
      <img src={e.thumbnail} alt={e.filename} className="w-full rounded border border-border" />
      <div className="grid grid-cols-3 gap-2 font-mono text-xs">
        <Mini label="Var EEG" value={e.eeg.variance.toFixed(4)} />
        <Mini label="Amp EMG" value={e.emg.meanAmplitude.toFixed(4)} />
        <Mini label="Picos" value={`${e.eeg.peakCount}/${e.emg.peakCount}`} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" className="gap-1.5"
          onClick={() => exportPDF({
            filename: e.filename, thumbnail: e.thumbnail,
            eeg: e.eeg, emg: e.emg, classification: e.classification,
            date: new Date(e.date).toLocaleString("pt-BR"),
          })}>
          <FileText className="h-3.5 w-3.5" /> PDF
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5"
          onClick={() => exportCSV(e.eeg, e.emg, e.classification)}>
          <Download className="h-3.5 w-3.5" /> CSV
        </Button>
        <Button size="sm" variant="ghost" className="ml-auto gap-1.5 text-destructive hover:text-destructive"
          onClick={() => onDelete(e.id)}>
          <Trash2 className="h-3.5 w-3.5" /> Excluir
        </Button>
      </div>
    </Card>
  );
}

function ECoGCard({ entry: e, onDelete }: { entry: ECoGEntry; onDelete: (id: string) => void }) {
  return (
    <Card className="space-y-3 overflow-hidden p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs uppercase text-muted-foreground">
            <Brain className="h-3 w-3" /> ECoG
          </p>
          <p className="truncate text-sm font-medium">{e.filename}</p>
          <p className="text-xs text-muted-foreground">{new Date(e.date).toLocaleString("pt-BR")}</p>
        </div>
      </div>
      <div className="grid gap-2 grid-cols-1">
        <img src={e.thumbnail} alt="A" className="w-full rounded border border-border" />
        {e.thumbnail2 && <img src={e.thumbnail2} alt="B" className="w-full rounded border border-border" />}
      </div>
      <p className="text-xs">
        <span className="font-semibold">A:</span> {e.channelA.memoryPattern}
        {e.channelB && <> · <span className="font-semibold">B:</span> {e.channelB.memoryPattern}</>}
      </p>
      <div className="grid grid-cols-3 gap-2 font-mono text-xs">
        <Mini label="Consolid." value={`${(e.channelA.consolidationScore * 100).toFixed(0)}%`} />
        <Mini label="CMC" value={e.channelA.cmcReferenceLevel} />
        <Mini label="Freezing" value={`${e.channelA.cmcFreezingEstimate}%`} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" className="gap-1.5"
          onClick={() => exportECoGCSV([
            { label: "Canal A", data: e.channelA },
            ...(e.channelB ? [{ label: "Canal B", data: e.channelB }] : []),
          ])}>
          <Download className="h-3.5 w-3.5" /> CSV
        </Button>
        <Button size="sm" variant="ghost" className="ml-auto gap-1.5 text-destructive hover:text-destructive"
          onClick={() => onDelete(e.id)}>
          <Trash2 className="h-3.5 w-3.5" /> Excluir
        </Button>
      </div>
    </Card>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-border bg-muted/30 p-2">
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="text-foreground">{value}</p>
    </div>
  );
}
