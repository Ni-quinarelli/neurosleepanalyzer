import type { SignalMetrics, Classification } from "./signalAnalysis";
import { classificationToBinary } from "./signalAnalysis";

export function exportCSV(
  eeg: SignalMetrics,
  emg: SignalMetrics,
  classification: Classification,
) {
  const bin = classificationToBinary(classification);
  const headers = [
    "EEG_variance",
    "EEG_mean_amplitude",
    "EEG_peak_count",
    "EMG_variance",
    "EMG_mean_amplitude",
    "EMG_peak_count",
    "Classification",
    "Sono_ondas_lentas",
    "REM",
    "Vigilia",
  ];
  const row = [
    eeg.variance,
    eeg.meanAmplitude,
    eeg.peakCount,
    emg.variance,
    emg.meanAmplitude,
    emg.peakCount,
    classification,
    bin.Sono_ondas_lentas,
    bin.REM,
    bin.Vigilia,
  ];
  const csv = headers.join(",") + "\n" + row.join(",") + "\n";
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "sleep_analysis.csv";
  a.click();
  URL.revokeObjectURL(url);
}
