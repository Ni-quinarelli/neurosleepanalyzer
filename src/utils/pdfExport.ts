import jsPDF from "jspdf";
import type { SignalMetrics, Classification } from "./signalAnalysis";
import { classificationToBinary } from "./signalAnalysis";

interface PDFInput {
  filename?: string;
  thumbnail?: string;
  eeg: SignalMetrics;
  emg: SignalMetrics;
  classification: Classification;
  date?: string;
}

export function exportPDF({
  filename,
  thumbnail,
  eeg,
  emg,
  classification,
  date,
}: PDFInput) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  let y = 50;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("NeuroSleep Analytica — Relatório", 40, y);
  y += 22;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text(`Gerado em: ${date || new Date().toLocaleString("pt-BR")}`, 40, y);
  if (filename) {
    y += 14;
    doc.text(`Arquivo: ${filename}`, 40, y);
  }
  y += 24;

  if (thumbnail) {
    try {
      const imgW = pageW - 80;
      const imgH = imgW * 0.45;
      doc.addImage(thumbnail, "JPEG", 40, y, imgW, imgH);
      y += imgH + 20;
    } catch {
      /* ignore image errors */
    }
  }

  const labelMap: Record<Classification, string> = {
    "Slow-Wave Sleep": "Sono de Ondas Lentas",
    REM: "Sono REM",
    Wakefulness: "Vigília",
  };

  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Classificação", 40, y);
  y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text(labelMap[classification], 40, y);
  y += 24;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Métricas do sinal", 40, y);
  y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);

  const rows: [string, string, string, string][] = [
    ["Sinal", "Variância", "Amplitude Média", "Picos"],
    ["EEG", eeg.variance.toFixed(4), eeg.meanAmplitude.toFixed(4), String(eeg.peakCount)],
    ["EMG", emg.variance.toFixed(4), emg.meanAmplitude.toFixed(4), String(emg.peakCount)],
  ];
  const colX = [40, 160, 280, 440];
  rows.forEach((row, idx) => {
    if (idx === 0) doc.setFont("helvetica", "bold");
    else doc.setFont("helvetica", "normal");
    row.forEach((cell, i) => doc.text(cell, colX[i], y));
    y += 16;
    doc.setDrawColor(220);
    doc.line(40, y - 4, pageW - 40, y - 4);
  });

  y += 14;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Saída binária", 40, y);
  y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const bin = classificationToBinary(classification);
  const binRows: [string, string, string][] = [
    ["Sono_ondas_lentas", "REM", "Vigilia"],
    [String(bin.Sono_ondas_lentas), String(bin.REM), String(bin.Vigilia)],
  ];
  binRows.forEach((row, idx) => {
    if (idx === 0) doc.setFont("helvetica", "bold");
    else doc.setFont("helvetica", "normal");
    row.forEach((cell, i) => doc.text(cell, 40 + i * 160, y));
    y += 16;
  });

  doc.save(`neurosleep_${Date.now()}.pdf`);
}
