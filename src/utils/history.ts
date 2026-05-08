import type { SignalMetrics, Classification } from "@/utils/signalAnalysis";

export interface HistoryEntry {
  id: string;
  date: string;
  filename: string;
  thumbnail: string; // data URL
  eeg: SignalMetrics;
  emg: SignalMetrics;
  classification: Classification;
}

const KEY = "neurosleep_history_v1";

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
  // cap at 50 to avoid quota issues
  const trimmed = list.slice(0, 50);
  localStorage.setItem(KEY, JSON.stringify(trimmed));
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
