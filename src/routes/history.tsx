import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Trash2, Download, FileText, Database, Activity, Brain, BarChart3 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid,
  PieChart, Pie, Cell,
  Radar, RadarChart, PolarGrid, PolarAngleAxis,
  LineChart, Line,
} from "recharts";
import {
  clearHistory, deleteEntry, loadHistory,
  type HistoryEntry, type EEGEMGEntry, type ECoGEntry,
} from "@/utils/history";
import type { Classification, MemoryPattern } from "@/utils/signalAnalysis";
import { exportHistoryCSV } from "@/utils/csvExport";
import { exportElementPDF } from "@/utils/pdfExport";
import { buildFromEEGEMG, buildFromECoG } from "@/components/TraumaPatternsCard";

export const Route = createFileRoute("/history")({
  component: HistoryPage,
  head: () => ({
    meta: [
      { title: "Histórico — NeuroSleep Analytica" },
      { name: "description", content: "Banco de análises com gráficos comparativos." },
    ],
  }),
});

// -------- helpers ----------
function shortName(name: string, len = 14) {
  if (!name) return "—";
  return name.length > len ? name.slice(0, len) + "…" : name;
}

function cmcFromClassification(c: Classification): string {
  if (c === "Slow-Wave Sleep") return "Consolidação";
  if (c === "REM") return "Reprocessamento Emocional";
  return "Reativação / Expressão (Vigília)";
}
function cmcFromMemory(m: MemoryPattern): string {
  if (m === "Consolidação de Memória (SWS dominante)") return "Consolidação";
  if (m === "Reprocessamento Emocional (REM dominante)") return "Reprocessamento Emocional";
  if (m === "Hipervigilância / Reativação Traumática") return "Reativação Traumática";
  return "Inconclusiva";
}

interface DerivedRow {
  id: string;
  filename: string;
  type: HistoryEntry["type"];
  classificationLabel: string;
  eegVar: number;
  emgVar: number;
  consIndex: number;
  swr: number;
  fusos: number;
  cmcPhase: string;
  thetaPct: number;
}

function derive(e: HistoryEntry): DerivedRow {
  if (e.type === "eeg-emg") {
    const r = e.eeg.relativeBandPowers;
    return {
      id: e.id,
      filename: e.filename,
      type: e.type,
      classificationLabel:
        e.classification === "Slow-Wave Sleep" ? "Sono Ondas Lentas" :
        e.classification === "REM" ? "Sono REM" : "Vigília",
      eegVar: e.eeg.variance,
      emgVar: e.emg.variance,
      consIndex: Math.round(r.delta * 100),
      swr: Math.round((r.gamma * 100) / 5),
      fusos: Math.round((r.beta * 100) / 5),
      cmcPhase: cmcFromClassification(e.classification),
      thetaPct: Math.round(r.theta * 100),
    };
  }
  const m = e.channelA.metrics;
  const r = m.relativeBandPowers;
  return {
    id: e.id,
    filename: e.filename,
    type: e.type,
    classificationLabel: e.channelA.memoryPattern,
    eegVar: m.variance,
    emgVar: e.channelB?.metrics.variance ?? 0,
    consIndex: Math.round(e.channelA.consolidationScore * 100),
    swr: Math.round(e.channelA.burstDensity / 2),
    fusos: Math.round((r.beta * 100) / 5),
    cmcPhase: cmcFromMemory(e.channelA.memoryPattern),
    thetaPct: Math.round(r.theta * 100),
  };
}

const COLORS = {
  blue: "hsl(220 70% 50%)",
  teal: "hsl(170 65% 45%)",
  purple: "hsl(265 60% 55%)",
  yellow: "hsl(45 80% 55%)",
  green: "hsl(145 55% 45%)",
};

function HistoryPage() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setEntries(loadHistory()); }, []);
  const refresh = () => setEntries(loadHistory());
  const handleDelete = (id: string) => { deleteEntry(id); refresh(); };
  const handleClear = () => {
    if (confirm("Limpar todo o histórico?")) { clearHistory(); refresh(); }
  };

  const eegEmg = entries.filter((e): e is EEGEMGEntry => e.type === "eeg-emg");
  const ecog = entries.filter((e): e is ECoGEntry => e.type === "ecog");

  const rows = useMemo(() => entries.map(derive), [entries]);

  // ---- Top metrics ----
  const total = entries.length;
  const sws = eegEmg.filter((e) => e.classification === "Slow-Wave Sleep").length;
  const rem = eegEmg.filter((e) => e.classification === "REM").length;
  const wake = eegEmg.filter((e) => e.classification === "Wakefulness").length;

  // ---- Pie ----
  const pieData = useMemo(() => {
    const data = [
      { name: "Vigília", value: wake, color: COLORS.teal },
      { name: "Ondas Lentas", value: sws, color: COLORS.purple },
      { name: "REM", value: rem, color: COLORS.blue },
    ].filter((d) => d.value > 0);
    return data;
  }, [wake, sws, rem]);

  // ---- Radar (EEG/EMG vs ECoG) ----
  const radarData = useMemo(() => {
    const avg = (arr: DerivedRow[], key: keyof DerivedRow) =>
      arr.length ? arr.reduce((s, r) => s + (r[key] as number), 0) / arr.length : 0;
    const eRows = rows.filter((r) => r.type === "eeg-emg");
    const cRows = rows.filter((r) => r.type === "ecog");
    return [
      { axis: "Consolidação", "EEG/EMG": avg(eRows, "consIndex"), "ECoG": avg(cRows, "consIndex") },
      { axis: "SWR",          "EEG/EMG": avg(eRows, "swr"),       "ECoG": avg(cRows, "swr") },
      { axis: "Fusos",        "EEG/EMG": avg(eRows, "fusos"),     "ECoG": avg(cRows, "fusos") },
      { axis: "Theta %",      "EEG/EMG": avg(eRows, "thetaPct"),  "ECoG": avg(cRows, "thetaPct") },
    ];
  }, [rows]);

  // ---- Bar (last 6 EEG vs EMG variance) ----
  const barData = useMemo(() => rows.slice(0, 6).reverse().map((r) => ({
    name: shortName(r.filename, 12),
    "EEG Variância": Number(r.eegVar.toFixed(4)),
    "EMG Variância": Number(r.emgVar.toFixed(4)),
  })), [rows]);

  // ---- Line (consolidation index over time) ----
  const lineData = useMemo(() => rows.slice(0, 12).reverse().map((r) => ({
    name: shortName(r.filename, 12),
    Consolidação: r.consIndex,
  })), [rows]);

  return (
    <div ref={pageRef} className="mx-auto max-w-6xl space-y-6 px-6 py-8">
      {/* Top stat cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total de Análises" value={total} color="text-foreground" />
        <StatCard label="Sono de Ondas Lentas" value={sws} color="text-emerald-600" />
        <StatCard label="Sono REM" value={rem} color="text-purple-600" />
        <StatCard label="Vigília" value={wake} color="text-amber-500" />
      </div>

      {entries.length === 0 ? (
        <Card className="p-12 text-center text-sm text-muted-foreground">
          Nenhuma análise ainda.
        </Card>
      ) : (
        <>
          {/* Comparativos */}
          <div className="space-y-3">
            <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <BarChart3 className="h-4 w-4" /> Gráficos Comparativos
            </p>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Distribuição de Classificações
                </p>
                <div className="h-64">
                  {pieData.length === 0 ? (
                    <EmptyChart />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={0}
                          outerRadius={90}
                          label={(e: { name: string; percent: number }) => `${e.name} ${Math.round(e.percent * 100)}%`}
                          labelLine={false}
                        >
                          {pieData.map((d) => (
                            <Cell key={d.name} fill={d.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </Card>

              <Card className="p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Comparativo EEG/EMG vs ECoG
                </p>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData} outerRadius="75%">
                      <PolarGrid />
                      <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11 }} />
                      <Radar name="EEG/EMG" dataKey="EEG/EMG" stroke={COLORS.blue} fill={COLORS.blue} fillOpacity={0.25} />
                      <Radar name="ECoG" dataKey="ECoG" stroke={COLORS.purple} fill={COLORS.purple} fillOpacity={0.25} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            <Card className="p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Variância EEG vs EMG (últimas 6 análises)
              </p>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="EEG Variância" fill={COLORS.blue} />
                    <Bar dataKey="EMG Variância" fill={COLORS.teal} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Índice de Consolidação ao longo das análises
              </p>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lineData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="Consolidação" stroke={COLORS.blue} strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Banco de Análises */}
          <Card className="overflow-x-auto p-0">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                <p className="text-sm font-semibold">Banco de Análises</p>
                <span className="text-xs text-muted-foreground">({entries.length} registros)</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="gap-1.5"
                  onClick={() => exportHistoryCSV(entries)}>
                  <Download className="h-4 w-4" /> CSV
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5"
                  onClick={() => pageRef.current && exportElementPDF(pageRef.current, "neurosleep_historico")}>
                  <FileText className="h-4 w-4" /> PDF
                </Button>
                <Button variant="outline" size="sm" onClick={handleClear} className="gap-1.5 text-destructive">
                  <Trash2 className="h-4 w-4" /> Limpar
                </Button>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Arquivo</TableHead>
                  <TableHead>Fonte</TableHead>
                  <TableHead>Classificação</TableHead>
                  <TableHead>EEG Var.</TableHead>
                  <TableHead>EMG Var.</TableHead>
                  <TableHead>Cons. Index</TableHead>
                  <TableHead>SWR</TableHead>
                  <TableHead>Fusos</TableHead>
                  <TableHead>CMC Fase</TableHead>
                  <TableHead className="text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs" title={r.filename}>{shortName(r.filename, 14)}</TableCell>
                    <TableCell>
                      {r.type === "eeg-emg" ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-blue-300 bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-800">
                          <Activity className="h-3 w-3" /> EEG/EMG
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-purple-300 bg-purple-50 px-2 py-0.5 text-[11px] font-medium text-purple-800">
                          <Brain className="h-3 w-3" /> ECoG
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                        {r.classificationLabel}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{r.eegVar.toFixed(6)}</TableCell>
                    <TableCell className="font-mono text-xs">{r.emgVar.toFixed(6)}</TableCell>
                    <TableCell className="font-mono text-xs">{r.consIndex}</TableCell>
                    <TableCell className="font-mono text-xs">{r.swr}</TableCell>
                    <TableCell className="font-mono text-xs">{r.fusos}</TableCell>
                    <TableCell className="text-xs">{r.cmcPhase}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive"
                        onClick={() => handleDelete(r.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card className="p-4 text-center">
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </Card>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
      Sem dados suficientes
    </div>
  );
}
