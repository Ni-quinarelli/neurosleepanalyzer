import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Trash2, Download, FileText, Database, Activity, Brain } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid,
} from "recharts";
import { ClassificationBadge } from "@/components/ClassificationBadge";
import {
  clearHistory, deleteEntry, loadHistory,
  type HistoryEntry, type EEGEMGEntry, type ECoGEntry,
} from "@/utils/history";
import { exportPDF } from "@/utils/pdfExport";
import { exportCSV, exportECoGCSV, exportHistoryCSV } from "@/utils/csvExport";

export const Route = createFileRoute("/history")({
  component: HistoryPage,
  head: () => ({
    meta: [
      { title: "Histórico — NeuroSleep Analytica" },
      { name: "description", content: "Banco de análises com gráficos comparativos." },
    ],
  }),
});

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

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
    name: e.meta?.subject || `#${i + 1}`,
    "Variância EEG": Number(e.eeg.variance.toFixed(4)),
    "Amplitude EMG": Number(e.emg.meanAmplitude.toFixed(4)),
  })), [eegEmg]);

  const ecogChart = useMemo(() => ecog.slice(0, 10).reverse().map((e, i) => ({
    name: e.meta?.subject || `#${i + 1}`,
    "Consolidação (%)": Math.round(e.channelA.consolidationScore * 100),
    "Freezing CMC (%)": e.channelA.cmcFreezingEstimate,
  })), [ecog]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          <div>
            <p className="text-base font-semibold">Banco de Análises</p>
            <p className="text-xs text-muted-foreground">{entries.length} registro(s)</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={entries.length === 0}
            className="gap-1.5"
            onClick={() => exportHistoryCSV(entries)}
          >
            <Download className="h-4 w-4" /> CSV
          </Button>
          {entries.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleClear} className="gap-1.5 text-destructive">
              <Trash2 className="h-4 w-4" /> Limpar tudo
            </Button>
          )}
        </div>
      </Card>

      {entries.length === 0 && (
        <Card className="p-12 text-center text-sm text-muted-foreground">
          Nenhuma análise ainda.
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

      {entries.length > 0 && (
        <Card className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Fonte</TableHead>
                <TableHead>Sujeito</TableHead>
                <TableHead>Grupo</TableHead>
                <TableHead>Coleta</TableHead>
                <TableHead>Época</TableHead>
                <TableHead>Arquivo</TableHead>
                <TableHead>Resultado</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="whitespace-nowrap text-xs font-mono">{fmtDate(e.date)}</TableCell>
                  <TableCell>
                    {e.type === "eeg-emg" ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-blue-300 bg-blue-50 px-2 py-0.5 text-xs text-blue-800">
                        <Activity className="h-3 w-3" /> EEG/EMG
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-purple-300 bg-purple-50 px-2 py-0.5 text-xs text-purple-800">
                        <Brain className="h-3 w-3" /> ECoG
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">{e.meta?.subject || "—"}</TableCell>
                  <TableCell className="text-xs">{e.meta?.group || "—"}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs">
                    {e.meta?.collectedAt ? new Date(e.meta.collectedAt).toLocaleString("pt-BR") : "—"}
                  </TableCell>
                  <TableCell className="text-xs">{e.meta?.epoch || "—"}</TableCell>
                  <TableCell className="max-w-[180px] truncate text-xs" title={e.filename}>{e.filename}</TableCell>
                  <TableCell>
                    {e.type === "eeg-emg" ? (
                      <ClassificationBadge value={e.classification} />
                    ) : (
                      <span className="text-xs">
                        {Math.round(e.channelA.consolidationScore * 100)}% · CMC {e.channelA.cmcReferenceLevel}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {e.type === "eeg-emg" && (
                        <>
                          <Button size="sm" variant="ghost" className="h-7 px-2"
                            onClick={() => exportPDF({
                              filename: e.filename, eeg: e.eeg, emg: e.emg,
                              classification: e.classification, date: fmtDate(e.date), meta: e.meta,
                            })}>
                            <FileText className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2"
                            onClick={() => exportCSV(e.eeg, e.emg, e.classification, e.meta)}>
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      {e.type === "ecog" && (
                        <Button size="sm" variant="ghost" className="h-7 px-2"
                          onClick={() => exportECoGCSV(
                            [{ label: "Canal A", data: e.channelA }, ...(e.channelB ? [{ label: "Canal B", data: e.channelB }] : [])],
                            e.meta,
                          )}>
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive"
                        onClick={() => handleDelete(e.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
