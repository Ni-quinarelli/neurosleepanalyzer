import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Download, FileImage, Brain } from "lucide-react";
import { SingleUpload } from "@/components/SingleUpload";
import { PageHeader } from "@/components/PageHeader";
import { SignalChart } from "@/components/SignalChart";
import { MetadataForm, emptyMeta, type RecordMeta } from "@/components/MetadataForm";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { loadSignal } from "@/utils/signalLoader";
import { analyzeECoG, type ECoGAnalysis } from "@/utils/signalAnalysis";
import { exportECoGCSV } from "@/utils/csvExport";
import { exportElementPDF } from "@/utils/pdfExport";
import { saveEntry } from "@/utils/history";

export const Route = createFileRoute("/ecog")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Análise ECoG — NeuroSleep Analytica" },
      { name: "description", content: "Análise de ECoG e padrões de memória traumática com escala de referência CMC." },
    ],
  }),
});

function Page() {
  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);
  const [previewA, setPreviewA] = useState<string | null>(null);
  const [previewB, setPreviewB] = useState<string | null>(null);
  const [signalA, setSignalA] = useState<number[] | null>(null);
  const [signalB, setSignalB] = useState<number[] | null>(null);
  const [meta, setMeta] = useState<RecordMeta>(emptyMeta);
  const [savedId, setSavedId] = useState<string | null>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!fileA) { setPreviewA(null); setSignalA(null); return; }
    const url = URL.createObjectURL(fileA);
    setPreviewA(url);
    loadSignal(fileA).then(setSignalA);
    return () => URL.revokeObjectURL(url);
  }, [fileA]);

  useEffect(() => {
    if (!fileB) { setPreviewB(null); setSignalB(null); return; }
    const url = URL.createObjectURL(fileB);
    setPreviewB(url);
    loadSignal(fileB).then(setSignalB);
    return () => URL.revokeObjectURL(url);
  }, [fileB]);

  useEffect(() => { setSavedId(null); }, [fileA, fileB]);

  const analysisA = useMemo(() => signalA ? analyzeECoG(signalA) : null, [signalA]);
  const analysisB = useMemo(() => signalB ? analyzeECoG(signalB) : null, [signalB]);

  useEffect(() => {
    if (!analysisA || !fileA || savedId) return;
    const id = `${Date.now()}`;
    saveEntry({
      id,
      date: new Date().toISOString(),
      type: "ecog",
      filename: `${fileA.name}${fileB ? " + " + fileB.name : ""}`,
      meta,
      channelA: analysisA,
      channelB: analysisB ?? undefined,
    });
    setSavedId(id);
  }, [analysisA, analysisB, fileA, fileB, savedId, meta]);

  return (
    <div ref={pageRef} className="mx-auto max-w-6xl space-y-6 px-6 py-8">
      <PageHeader />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Análise ECoG</h1>
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
          O ECoG (eletrocorticografia) permite visualizar a atividade cortical envolvida na{" "}
          formação e recuperação de memórias traumáticas. Anexe um ou dois traçados (por exemplo,
          pré e pós condicionamento) para identificar padrões de consolidação, reprocessamento
          emocional e hipervigilância. A escala de referência <strong>CMC</strong> (Condicionamento
          de Medo ao Contexto) é estimada teoricamente a partir desses padrões.
        </p>
      </div>

      <MetadataForm value={meta} onChange={setMeta} />

      <div className="grid gap-4 md:grid-cols-2">
        <SingleUpload
          label="ECoG — Canal A"
          accent="purple"
          file={fileA}
          preview={previewA}
          onFile={setFileA}
          hint="Ex: pré-condicionamento"
        />
        <SingleUpload
          label="ECoG — Canal B (opcional)"
          accent="teal"
          file={fileB}
          preview={previewB}
          onFile={setFileB}
          hint="Ex: pós-condicionamento"
        />
      </div>

      {analysisA && signalA && (
        <Card className="space-y-4 p-4">
          <ChannelBlock title="Canal A" analysis={analysisA} signal={signalA} color="hsl(265 60% 50%)" />
          {analysisB && signalB && (
            <>
              <hr className="border-border" />
              <ChannelBlock title="Canal B" analysis={analysisB} signal={signalB} color="hsl(180 50% 40%)" />
            </>
          )}
        </Card>
      )}

      {analysisA && analysisB && (
        <Card className="p-4">
          <p className="mb-3 text-sm font-medium">Comparativo A vs B</p>
          <ComparativeTable a={analysisA} b={analysisB} />
        </Card>
      )}

      {analysisA && (
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => pageRef.current && exportElementPDF(pageRef.current, "neurosleep_ecog_pagina")}
          >
            <FileImage className="h-4 w-4" /> Baixar página em PDF
          </Button>
          <Button
            className="gap-2"
            onClick={() =>
              exportECoGCSV(
                [{ label: "Canal A", data: analysisA }, ...(analysisB ? [{ label: "Canal B", data: analysisB }] : [])],
                meta,
              )
            }
          >
            <Download className="h-4 w-4" /> Baixar CSV
          </Button>
        </div>
      )}
    </div>
  );
}

function ChannelBlock({
  title, analysis, signal, color,
}: { title: string; analysis: ECoGAnalysis; signal: number[]; color: string }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-medium">
          <Brain className="h-4 w-4 text-primary" /> {title}
        </p>
        <PatternBadge pattern={analysis.memoryPattern} />
      </div>
      <SignalChart data={signal} color={color} label="ECoG" />
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Stat label="Score Consolidação" value={`${(analysis.consolidationScore * 100).toFixed(0)}%`} />
        <Stat label="Burst density" value={analysis.burstDensity.toFixed(2)} />
        <Stat label="CMC (referência)" value={analysis.cmcReferenceLevel} />
        <Stat label="Freezing estimado" value={`${analysis.cmcFreezingEstimate}%`} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-border bg-muted/30 p-2">
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="font-mono text-sm">{value}</p>
    </div>
  );
}

function PatternBadge({ pattern }: { pattern: ECoGAnalysis["memoryPattern"] }) {
  const colorMap: Record<ECoGAnalysis["memoryPattern"], string> = {
    "Consolidação de Memória (SWS dominante)": "bg-blue-100 text-blue-800 border-blue-300",
    "Reprocessamento Emocional (REM dominante)": "bg-purple-100 text-purple-800 border-purple-300",
    "Hipervigilância / Reativação Traumática": "bg-red-100 text-red-800 border-red-300",
    "Padrão Inconclusivo": "bg-gray-100 text-gray-700 border-gray-300",
  };
  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${colorMap[pattern]}`}>
      {pattern}
    </span>
  );
}

function ComparativeTable({ a, b }: { a: ECoGAnalysis; b: ECoGAnalysis }) {
  const rows: [string, string, string][] = [
    ["Padrão de memória", a.memoryPattern, b.memoryPattern],
    ["Score de consolidação", `${(a.consolidationScore * 100).toFixed(0)}%`, `${(b.consolidationScore * 100).toFixed(0)}%`],
    ["Burst density", a.burstDensity.toFixed(2), b.burstDensity.toFixed(2)],
    ["Slow oscillation", a.slowOscillationIndex.toFixed(4), b.slowOscillationIndex.toFixed(4)],
    ["Fast oscillation", a.fastOscillationIndex.toFixed(4), b.fastOscillationIndex.toFixed(4)],
    ["CMC referência", a.cmcReferenceLevel, b.cmcReferenceLevel],
    ["Freezing estimado", `${a.cmcFreezingEstimate}%`, `${b.cmcFreezingEstimate}%`],
  ];
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Métrica</TableHead>
          <TableHead>Canal A</TableHead>
          <TableHead>Canal B</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(([k, av, bv]) => (
          <TableRow key={k}>
            <TableCell className="font-medium">{k}</TableCell>
            <TableCell className="font-mono text-xs">{av}</TableCell>
            <TableCell className="font-mono text-xs">{bv}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
