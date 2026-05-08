export interface SignalMetrics {
  variance: number;
  meanAmplitude: number;
  peakCount: number;
}

export type Classification = "Slow-Wave Sleep" | "REM" | "Wakefulness";

export interface Thresholds {
  eegVariance: number;
  emgAmplitude: number;
  peakSensitivity: number;
}

export const defaultThresholds: Thresholds = {
  eegVariance: 0.02,
  emgAmplitude: 0.15,
  peakSensitivity: 0.05,
};

export function computeMetrics(signal: number[], peakSensitivity: number): SignalMetrics {
  if (!signal.length) return { variance: 0, meanAmplitude: 0, peakCount: 0 };
  const mean = signal.reduce((a, b) => a + b, 0) / signal.length;
  const variance =
    signal.reduce((acc, v) => acc + (v - mean) ** 2, 0) / signal.length;
  const meanAmplitude =
    signal.reduce((acc, v) => acc + Math.abs(v - 0.5), 0) / signal.length;

  let peakCount = 0;
  for (let i = 1; i < signal.length - 1; i++) {
    if (
      signal[i] - signal[i - 1] > peakSensitivity &&
      signal[i] - signal[i + 1] > peakSensitivity
    ) {
      peakCount++;
    }
  }
  return { variance, meanAmplitude, peakCount };
}

export function classify(
  eeg: SignalMetrics,
  emg: SignalMetrics,
  t: Thresholds,
): Classification {
  if (emg.meanAmplitude >= t.emgAmplitude) return "Wakefulness";
  if (eeg.variance > t.eegVariance && emg.meanAmplitude < 0.1) return "REM";
  if (eeg.variance < t.eegVariance && emg.meanAmplitude < t.emgAmplitude)
    return "Slow-Wave Sleep";
  // Fallback: pick closest
  return eeg.variance > t.eegVariance ? "REM" : "Slow-Wave Sleep";
}

export function classificationToBinary(c: Classification) {
  return {
    Sono_ondas_lentas: c === "Slow-Wave Sleep" ? 1 : 0,
    REM: c === "REM" ? 1 : 0,
    Vigilia: c === "Wakefulness" ? 1 : 0,
  };
}
