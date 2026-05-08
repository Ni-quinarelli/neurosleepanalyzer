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
  return eeg.variance > t.eegVariance ? "REM" : "Slow-Wave Sleep";
}

export function classificationToBinary(c: Classification) {
  return {
    Sono_ondas_lentas: c === "Slow-Wave Sleep" ? 1 : 0,
    REM: c === "REM" ? 1 : 0,
    Vigilia: c === "Wakefulness" ? 1 : 0,
  };
}

// ===== ECoG / Memory pattern analysis =====

export type MemoryPattern =
  | "Consolidação de Memória (SWS dominante)"
  | "Reprocessamento Emocional (REM dominante)"
  | "Hipervigilância / Reativação Traumática"
  | "Padrão Inconclusivo";

export type CMCLevel = "Baixa" | "Moderada" | "Alta";

export interface ECoGAnalysis {
  metrics: SignalMetrics;
  // proxies derived from the trace for slow / fast oscillations
  slowOscillationIndex: number; // higher → mais ondas lentas (consolidação SWS)
  fastOscillationIndex: number; // higher → mais ritmo rápido (REM/teta-gamma)
  burstDensity: number; // picos por 1000 amostras (reativações)
  memoryPattern: MemoryPattern;
  consolidationScore: number; // 0..1 — probabilidade de consolidação saudável
  cmcReferenceLevel: CMCLevel; // escala teórica de medo condicionado
  cmcFreezingEstimate: number; // % freezing estimado por referência teórica
}

/**
 * Analyze a single ECoG trace for traumatic-memory-relevant patterns.
 *
 * Heuristics (reference scale, not clinical):
 *  - slowOscillationIndex: variância em janelas largas (low-freq power proxy)
 *  - fastOscillationIndex: variância da derivada (high-freq power proxy)
 *  - burstDensity: picos por amostra (gamma bursts / sharp-wave ripples proxy)
 *  - consolidationScore: favorece SWS-like (alto slow / baixo fast)
 *  - CMC reference (Condicionamento de Medo ao Contexto): inverso da
 *    consolidação saudável — quanto mais hipervigilância, maior freezing
 *    estimado teoricamente.
 */
export function analyzeECoG(signal: number[], peakSensitivity = 0.05): ECoGAnalysis {
  const metrics = computeMetrics(signal, peakSensitivity);

  // low-freq proxy: variance of windowed averages (window = 16)
  const win = 16;
  const lowSeries: number[] = [];
  for (let i = 0; i + win <= signal.length; i += win) {
    let s = 0;
    for (let j = i; j < i + win; j++) s += signal[j];
    lowSeries.push(s / win);
  }
  const lowMean = lowSeries.reduce((a, b) => a + b, 0) / Math.max(1, lowSeries.length);
  const slowOscillationIndex =
    lowSeries.reduce((a, v) => a + (v - lowMean) ** 2, 0) /
    Math.max(1, lowSeries.length);

  // high-freq proxy: variance of first difference
  const deriv: number[] = [];
  for (let i = 1; i < signal.length; i++) deriv.push(signal[i] - signal[i - 1]);
  const dMean = deriv.reduce((a, b) => a + b, 0) / Math.max(1, deriv.length);
  const fastOscillationIndex =
    deriv.reduce((a, v) => a + (v - dMean) ** 2, 0) / Math.max(1, deriv.length);

  const burstDensity = (metrics.peakCount / Math.max(1, signal.length)) * 1000;

  // Normalized contributions
  const slowN = clamp01(slowOscillationIndex / 0.04);
  const fastN = clamp01(fastOscillationIndex / 0.01);
  const burstN = clamp01(burstDensity / 30);

  // Consolidation: high slow, moderate fast, low excessive bursts
  const consolidationScore = clamp01(0.6 * slowN + 0.3 * (1 - burstN) + 0.1 * (1 - fastN));

  let memoryPattern: MemoryPattern;
  if (burstN > 0.7 && fastN > 0.6) memoryPattern = "Hipervigilância / Reativação Traumática";
  else if (slowN > 0.55 && burstN < 0.5) memoryPattern = "Consolidação de Memória (SWS dominante)";
  else if (fastN > 0.5 && slowN < 0.4) memoryPattern = "Reprocessamento Emocional (REM dominante)";
  else memoryPattern = "Padrão Inconclusivo";

  // CMC reference scale — inverted: low consolidation + high bursts → mais freezing
  const cmcRaw = clamp01(0.7 * burstN + 0.3 * (1 - consolidationScore));
  const cmcFreezingEstimate = Math.round(cmcRaw * 100);
  const cmcReferenceLevel: CMCLevel =
    cmcRaw < 0.33 ? "Baixa" : cmcRaw < 0.66 ? "Moderada" : "Alta";

  return {
    metrics,
    slowOscillationIndex,
    fastOscillationIndex,
    burstDensity,
    memoryPattern,
    consolidationScore,
    cmcReferenceLevel,
    cmcFreezingEstimate,
  };
}

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}
