import type { SignalMetrics, Classification, ECoGAnalysis } from "@/utils/signalAnalysis";

export type AnalysisType = "eeg-emg" | "ecog";

interface BaseEntry {
  id: string;
  date: string;
  type: AnalysisType;
  filename: string;
  thumbnail: string;
}

export interface EEGEMGEntry extends BaseEntry {
  type: "eeg-emg";
  eeg: SignalMetrics;
  emg: SignalMetrics;
  classification: Classification;
}

export interface ECoGEntry extends BaseEntry {
  type: "ecog";
  thumbnail2?: string;
  channelA: ECoGAnalysis;
  channelB?: ECoGAnalysis;
}

export type HistoryEntry = EEGEMGEntry | ECoGEntry;

const KEY = "neurosleep_history_v2";

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
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, 50)));
}

export function deleteEntry(id: string) {
  const list = loadHistory().filter((e) => e.id !== id);
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function clearHistory() {
  localStorage.removeItem(KEY);
}

export async function fileToThumbnail(file: File, maxW = 320): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const scale = img.width > maxW ? maxW / img.width : 1;
    const w = Math.floor(img.width * scale);
    const h = Math.floor(img.height * scale);
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    c.getContext("2d")!.drawImage(img, 0, 0, w, h);
    return c.toDataURL("image/jpeg", 0.7);
  } finally {
    URL.revokeObjectURL(url);
  }
}
