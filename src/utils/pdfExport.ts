import jsPDF from "jspdf";
import html2canvas from "html2canvas";
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
    } catch { /* ignore */ }
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

/**
 * Capture a DOM element and save as a PDF (full-page screenshot style).
 */
export async function exportElementPDF(el: HTMLElement, baseName = "neurosleep") {
  const canvas = await html2canvas(el, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
    logging: false,
  });
  const imgData = canvas.toDataURL("image/jpeg", 0.92);
  const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const ratio = canvas.width / canvas.height;
  const imgW = pageW - 40;
  const imgH = imgW / ratio;

  if (imgH <= pageH - 40) {
    pdf.addImage(imgData, "JPEG", 20, 20, imgW, imgH);
  } else {
    // multi-page: slice the canvas
    const sliceH = (pageH - 40) * (canvas.width / imgW);
    let y = 0;
    while (y < canvas.height) {
      const remaining = Math.min(sliceH, canvas.height - y);
      const tmp = document.createElement("canvas");
      tmp.width = canvas.width;
      tmp.height = remaining;
      tmp.getContext("2d")!.drawImage(canvas, 0, y, canvas.width, remaining, 0, 0, canvas.width, remaining);
      const slice = tmp.toDataURL("image/jpeg", 0.92);
      if (y > 0) pdf.addPage();
      pdf.addImage(slice, "JPEG", 20, 20, imgW, (remaining * imgW) / canvas.width);
      y += remaining;
    }
  }
  pdf.save(`${baseName}_${Date.now()}.pdf`);
}
