import type { SignalMetrics, Classification, ECoGAnalysis } from "@/utils/signalAnalysis";
import type { RecordMeta } from "@/components/MetadataForm";

export type AnalysisType = "eeg-emg" | "ecog";

interface BaseEntry {
  id: string;
  date: string;
  type: AnalysisType;
  filename: string;
  meta?: RecordMeta;
}

export interface EEGEMGEntry extends BaseEntry {
  type: "eeg-emg";
  eeg: SignalMetrics;
  emg: SignalMetrics;
  classification: Classification;
}

export interface ECoGEntry extends BaseEntry {
  type: "ecog";
  channelA: ECoGAnalysis;
  channelB?: ECoGAnalysis;
}

export type HistoryEntry = EEGEMGEntry | ECoGEntry;

const KEY = "neurosleep_history_v3";

export function loadHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveEntry(entry: HistoryEntry) {
  const list = loadHistory();
  list.unshift(entry);
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, 100)));
}

export function deleteEntry(id: string) {
  const list = loadHistory().filter((e) => e.id !== id);
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function clearHistory() {
  localStorage.removeItem(KEY);
}
