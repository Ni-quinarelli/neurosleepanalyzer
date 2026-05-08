export interface ExtractedSignals {
  eeg: number[];
  emg: number[];
  width: number;
}

/**
 * Loads an image and extracts two signals (EEG top half, EMG bottom half)
 * by scanning each column for the darkest pixel.
 * Returns normalized values in 0..1 (1 = top of plot, 0 = bottom).
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
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Canvas context unavailable");
    ctx.drawImage(img, 0, 0, w, h);
    const { data } = ctx.getImageData(0, 0, w, h);

    const halfH = Math.floor(h / 2);
    const eeg = scanHalf(data, w, h, 0, halfH);
    const emg = scanHalf(data, w, h, halfH, h);
    return { eeg, emg, width: w };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function scanHalf(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  yStart: number,
  yEnd: number,
): number[] {
  const heightRange = yEnd - yStart;
  const signal: number[] = new Array(w);
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
    // invert so high signal = high value
    const rel = (minY - yStart) / heightRange;
    signal[x] = 1 - rel;
  }
  return signal;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
