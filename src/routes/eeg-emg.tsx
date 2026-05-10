import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Download, FileText, FileImage } from "lucide-react";
import { SingleUpload } from "@/components/SingleUpload";
import { PageHeader } from "@/components/PageHeader";
import { SignalChart } from "@/components/SignalChart";
import { MetricsTable } from "@/components/MetricsTable";
import { ClassificationBadge } from "@/components/ClassificationBadge";
import { ParameterPanel } from "@/components/ParameterPanel";
import { MetadataForm, emptyMeta, type RecordMeta } from "@/components/MetadataForm";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { loadSignal } from "@/utils/signalLoader";
import {
  classify, classificationToBinary, computeMetrics,
  defaultThresholds, type Thresholds, type SignalMetrics,
} from "@/utils/signalAnalysis";
import { exportCSV } from "@/utils/csvExport";
import { exportElementPDF, exportPDF } from "@/utils/pdfExport";
import { saveEntry } from "@/utils/history";
import { TraumaPatternsCard, buildFromEEGEMG } from "@/components/TraumaPatternsCard";

export const Route = createFileRoute("/eeg-emg")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Análise EEG/EMG — NeuroSleep Analytica" },
      { name: "description", content: "Anexe imagens separadas de EEG e EMG e classifique o estado de sono." },
    ],
  }),
});

function Page() {
  const [eegFile, setEegFile] = useState<File | null>(null);
  const [emgFile, setEmgFile] = useState<File | null>(null);
  const [eegPreview, setEegPreview] = useState<string | null>(null);
  const [emgPreview, setEmgPreview] = useState<string | null>(null);
  const [eegSignal, setEegSignal] = useState<number[] | null>(null);
  const [emgSignal, setEmgSignal] = useState<number[] | null>(null);
  const [thresholds, setThresholds] = useState<Thresholds>(defaultThresholds);
  const [meta, setMeta] = useState<RecordMeta>(emptyMeta);
  const [busy, setBusy] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!eegFile) { setEegPreview(null); setEegSignal(null); return; }
    const url = URL.createObjectURL(eegFile);
    setEegPreview(url);
    setBusy(true);
    loadSignal(eegFile).then(setEegSignal).finally(() => setBusy(false));
    return () => URL.revokeObjectURL(url);
  }, [eegFile]);

  useEffect(() => {
    if (!emgFile) { setEmgPreview(null); setEmgSignal(null); return; }
    const url = URL.createObjectURL(emgFile);
    setEmgPreview(url);
    setBusy(true);
    loadSignal(emgFile).then(setEmgSignal).finally(() => setBusy(false));
    return () => URL.revokeObjectURL(url);
  }, [emgFile]);

  useEffect(() => { setSavedId(null); }, [eegFile, emgFile]);

  const result = useMemo(() => {
    if (!eegSignal || !emgSignal) return null;
    const fs = Number(meta.samplingRate);
    const epoch = Number.isFinite(fs) && fs > 0
      ? eegSignal.length / fs
      : thresholds.epochDurationSec;
    const eeg = computeMetrics(eegSignal, thresholds.peakSensitivity, epoch);
    const emg = computeMetrics(emgSignal, thresholds.peakSensitivity, emgSignal.length / (Number.isFinite(fs) && fs > 0 ? fs : (emgSignal.length / thresholds.epochDurationSec)));
    const c = classify(eeg, emg, thresholds);
    return { eeg, emg, classification: c, binary: classificationToBinary(c) };
  }, [eegSignal, emgSignal, thresholds, meta.samplingRate]);

  useEffect(() => {
    if (!result || !eegFile || savedId) return;
    const id = `${Date.now()}`;
    saveEntry({
      id,
      date: new Date().toISOString(),
      type: "eeg-emg",
      filename: `${eegFile.name}${emgFile ? " + " + emgFile.name : ""}`,
      meta,
      eeg: result.eeg as SignalMetrics,
      emg: result.emg as SignalMetrics,
      classification: result.classification,
    });
    setSavedId(id);
  }, [result, eegFile, emgFile, savedId, meta]);

  return (
    <div ref={pageRef} className="mx-auto max-w-6xl space-y-6 px-6 py-8">
      <PageHeader />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Análise EEG/EMG</h1>
        <p className="text-sm text-muted-foreground">
          Faça upload de <strong>EEG</strong> e <strong>EMG</strong> separadamente — imagem do traçado
          (PNG/JPG) ou sinal bruto (<code>.csv</code>/<code>.txt</code>, uma amostra por linha).
          Para máxima precisão, informe a taxa de amostragem em Hz nos metadados.
        </p>
      </div>

      <MetadataForm value={meta} onChange={setMeta} />

      <div className="grid gap-4 md:grid-cols-2">
        <SingleUpload
          label="EEG — Eletroencefalograma"
          accent="blue"
          file={eegFile}
          preview={eegPreview}
          onFile={setEegFile}
          hint="Traçado cortical"
        />
        <SingleUpload
          label="EMG — Eletromiograma"
          accent="green"
          file={emgFile}
          preview={emgPreview}
          onFile={setEmgFile}
          hint="Traçado muscular"
        />
      </div>

      {busy && <p className="text-sm text-muted-foreground">Processando…</p>}

      {result && eegSignal && emgSignal && (
        <div className="space-y-6">
          <Card className="space-y-4 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Classificação</p>
              <ClassificationBadge value={result.classification} />
            </div>
            <SignalChart data={eegSignal} color="hsl(220 70% 45%)" label="EEG" />
            <SignalChart data={emgSignal} color="hsl(15 70% 45%)" label="EMG" />
          </Card>

          <Card className="p-4">
            <p className="mb-3 text-sm font-medium">Métricas do sinal</p>
            <MetricsTable eeg={result.eeg} emg={result.emg} />
          </Card>

          <TraumaPatternsCard data={buildFromEEGEMG(result.eeg, result.emg, result.classification)} />

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

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => pageRef.current && exportElementPDF(pageRef.current, "neurosleep_eeg_emg_pagina")}
            >
              <FileImage className="h-4 w-4" /> Baixar página em PDF
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => exportPDF({
                filename: eegFile?.name,
                eeg: result.eeg,
                emg: result.emg,
                classification: result.classification,
                meta,
              })}
            >
              <FileText className="h-4 w-4" /> Relatório PDF
            </Button>
            <Button
              className="gap-2"
              onClick={() => exportCSV(result.eeg, result.emg, result.classification, meta)}
            >
              <Download className="h-4 w-4" /> Baixar CSV
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
