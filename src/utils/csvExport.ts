import type { SignalMetrics, Classification, ECoGAnalysis } from "./signalAnalysis";
import { classificationToBinary } from "./signalAnalysis";
import type { RecordMeta } from "@/components/MetadataForm";
import type { HistoryEntry } from "./history";

function download(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function metaCells(meta?: RecordMeta) {
  return [
    `"${meta?.subject ?? ""}"`,
    `"${meta?.group ?? ""}"`,
    `"${meta?.collectedAt ?? ""}"`,
    `"${meta?.epoch ?? ""}"`,
  ];
}
const META_HEADERS = ["Subject", "Group", "Collected_At", "Epoch"];

export function exportCSV(eeg: SignalMetrics, emg: SignalMetrics, classification: Classification, meta?: RecordMeta) {
  const bin = classificationToBinary(classification);
  const headers = [
    ...META_HEADERS,
    "EEG_variance", "EEG_mean_amplitude", "EEG_peak_count",
    "EEG_dominant_freq_Hz", "EEG_sampling_rate_Hz",
    "EEG_delta_pct", "EEG_theta_pct", "EEG_alpha_pct", "EEG_beta_pct", "EEG_gamma_pct",
    "EMG_variance", "EMG_mean_amplitude", "EMG_peak_count",
    "EMG_dominant_freq_Hz", "EMG_sampling_rate_Hz",
    "EMG_delta_pct", "EMG_theta_pct", "EMG_alpha_pct", "EMG_beta_pct", "EMG_gamma_pct",
    "Classification",
    "Sono_ondas_lentas", "REM", "Vigilia",
  ];
  const pct = (n: number) => (n * 100).toFixed(2);
  const row = [
    ...metaCells(meta),
    eeg.variance, eeg.meanAmplitude, eeg.peakCount,
    eeg.dominantFrequency.toFixed(3), eeg.samplingRate.toFixed(2),
    pct(eeg.relativeBandPowers.delta), pct(eeg.relativeBandPowers.theta),
    pct(eeg.relativeBandPowers.alpha), pct(eeg.relativeBandPowers.beta),
    pct(eeg.relativeBandPowers.gamma),
    emg.variance, emg.meanAmplitude, emg.peakCount,
    emg.dominantFrequency.toFixed(3), emg.samplingRate.toFixed(2),
    pct(emg.relativeBandPowers.delta), pct(emg.relativeBandPowers.theta),
    pct(emg.relativeBandPowers.alpha), pct(emg.relativeBandPowers.beta),
    pct(emg.relativeBandPowers.gamma),
    classification,
    bin.Sono_ondas_lentas, bin.REM, bin.Vigilia,
  ];
  download("neurosleep_eeg_emg.csv", headers.join(",") + "\n" + row.join(",") + "\n");
}

export function exportECoGCSV(channels: { label: string; data: ECoGAnalysis }[], meta?: RecordMeta) {
  const headers = [
    ...META_HEADERS,
    "Channel",
    "Variance",
    "Mean_Amplitude",
    "Peak_Count",
    "Slow_Oscillation_Index",
    "Fast_Oscillation_Index",
    "Burst_Density",
    "Memory_Pattern",
    "Consolidation_Score",
    "CMC_Reference_Level",
    "CMC_Freezing_Estimate_Pct",
  ];
  const rows = channels.map(({ label, data }) => [
    ...metaCells(meta),
    label,
    data.metrics.variance,
    data.metrics.meanAmplitude,
    data.metrics.peakCount,
    data.slowOscillationIndex,
    data.fastOscillationIndex,
    data.burstDensity,
    `"${data.memoryPattern}"`,
    data.consolidationScore,
    data.cmcReferenceLevel,
    data.cmcFreezingEstimate,
  ]);
  const csv = headers.join(",") + "\n" + rows.map((r) => r.join(",")).join("\n") + "\n";
  download("neurosleep_ecog.csv", csv);
}

/** Export the entire history (mixed EEG/EMG + ECoG) as a flat CSV. */
export function exportHistoryCSV(entries: HistoryEntry[]) {
  const headers = [
    "Date", "Type", ...META_HEADERS, "Filename",
    "Classification", "EEG_variance", "EMG_mean_amplitude",
    "ECoG_Memory_Pattern", "ECoG_Consolidation_Pct",
    "ECoG_CMC_Reference", "ECoG_Freezing_Pct",
  ];
  const rows = entries.map((e) => {
    const base = [
      `"${e.date}"`, e.type, ...metaCells(e.meta), `"${e.filename}"`,
    ];
    if (e.type === "eeg-emg") {
      return [
        ...base, e.classification,
        e.eeg.variance.toFixed(6), e.emg.meanAmplitude.toFixed(6),
        "", "", "", "",
      ];
    }
    return [
      ...base, "",
      "", "",
      `"${e.channelA.memoryPattern}"`,
      Math.round(e.channelA.consolidationScore * 100),
      e.channelA.cmcReferenceLevel,
      e.channelA.cmcFreezingEstimate,
    ];
  });
  download("neurosleep_historico.csv", headers.join(",") + "\n" + rows.map((r) => r.join(",")).join("\n") + "\n");
}
