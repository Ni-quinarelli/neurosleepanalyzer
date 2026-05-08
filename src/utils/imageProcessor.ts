export interface ExtractedSignals {
  eeg: number[];
  emg: number[];
  width: number;
}

/**
 * Extract a single waveform from an image (full image height = one trace).
 * Used when EEG / EMG / ECoG come as separate uploads.
 */
export async function extractSingleSignal(file: File): Promise<number[]> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const maxW = 1200;
    const scale = img.width > maxW ? maxW / img.width : 1;
    const w = Math.floor(img.width * scale);
    const h = Math.floor(img.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0, w, h);
    const { data } = ctx.getImageData(0, 0, w, h);
    return scanColumn(data, w, h, 0, h);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Stacked image: top half = EEG, bottom half = EMG.
 * Kept for backwards compatibility.
 */
export async function extractSignalsFromImage(file: File): Promise<ExtractedSignals> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const maxW = 1200;
    const scale = img.width > maxW ? maxW / img.width : 1;
    const w = Math.floor(img.width * scale);
    const h = Math.floor(img.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0, w, h);
    const { data } = ctx.getImageData(0, 0, w, h);
    const halfH = Math.floor(h / 2);
    return {
      eeg: scanColumn(data, w, h, 0, halfH),
      emg: scanColumn(data, w, h, halfH, h),
      width: w,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function scanColumn(
  data: Uint8ClampedArray,
  w: number,
  _h: number,
  yStart: number,
  yEnd: number,
): number[] {
  const range = yEnd - yStart;
  const out = new Array<number>(w);
  for (let x = 0; x < w; x++) {
    let minSum = 765;
    let minY = yStart;
    for (let y = yStart; y < yEnd; y++) {
      const idx = (y * w + x) * 4;
      const sum = data[idx] + data[idx + 1] + data[idx + 2];
      if (sum < minSum) {
        minSum = sum;
        minY = y;
      }
    }
    out[x] = 1 - (minY - yStart) / range;
  }
  return out;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}
