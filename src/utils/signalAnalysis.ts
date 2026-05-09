// =====================================================================
// Análise de sinais fisiológicos calibrada por frequência.
//
// As imagens de EEG/EMG/ECoG são lidas como uma série temporal (1 amostra
// por coluna de pixel). Para extrair frequências reais (Hz) precisamos
// de uma referência temporal — quantos segundos a imagem representa.
//
// CALIBRAÇÃO PADRÃO (ajustável em ParameterPanel):
//   - epochDurationSec: duração assumida da janela mostrada na imagem.
//     Padrão = 10 s (uma "epoch" clássica de polissonografia).
//     Para ECG/ECoG impressos com 25 mm/s e ~250 mm de papel ≈ 10 s.
//
// BANDAS PADRÃO (Hz) — referência clínica:
//   delta  0.5–4   → Sono de Ondas Lentas (NREM 3–4)
//   theta  4–8     → REM, memória, hipocampo
//   alpha  8–13    → vigília relaxada / olhos fechados
//   beta   13–30   → vigília ativa / atenção
//   gamma  30–80   → consolidação, hipervigilância, reativação traumática
// =====================================================================

export interface BandPowers {
  delta: number;
  theta: number;
  alpha: number;
  beta: number;
  gamma: number;
}

export interface SignalMetrics {
  variance: number;
  meanAmplitude: number;
  peakCount: number;
  /** Frequência dominante em Hz (estimada via DFT). */
  dominantFrequency: number;
  /** Potência absoluta por banda. */
  bandPowers: BandPowers;
  /** Potência relativa (0..1) por banda — soma das 5 = 1. */
  relativeBandPowers: BandPowers;
  /** Frequência de amostragem (Hz) usada na análise. */
  samplingRate: number;
}

export type Classification = "Slow-Wave Sleep" | "REM" | "Wakefulness";

export interface Thresholds {
  /** Sensibilidade na detecção de picos (0..1, na escala do sinal normalizado). */
  peakSensitivity: number;
  /** Duração temporal assumida da imagem (segundos). Calibração crítica. */
  epochDurationSec: number;
  /** Limiar para considerar EMG "alto" (vigília) — fração de potência nas bandas alpha+beta+gamma. */
  emgActivityThreshold: number;
  /** Limiar mínimo de potência relativa em delta para classificar como SWS. */
  deltaDominanceThreshold: number;
  /** Limiar mínimo de potência relativa em theta para classificar como REM. */
  thetaDominanceThreshold: number;
}

export const defaultThresholds: Thresholds = {
  peakSensitivity: 0.05,
  epochDurationSec: 10,
  emgActivityThreshold: 0.35,
  deltaDominanceThreshold: 0.4,
  thetaDominanceThreshold: 0.3,
};

const BAND_RANGES: Record<keyof BandPowers, [number, number]> = {
  delta: [0.5, 4],
  theta: [4, 8],
  alpha: [8, 13],
  beta: [13, 30],
  gamma: [30, 80],
};

// ---------------------------------------------------------------------
// DFT por Goertzel: calcula |X[k]|² para um único bin k.
// ---------------------------------------------------------------------
function goertzelPower(signal: number[], k: number): number {
  const N = signal.length;
  const w = (2 * Math.PI * k) / N;
  const c = 2 * Math.cos(w);
  let q1 = 0;
  let q2 = 0;
  for (let i = 0; i < N; i++) {
    const q0 = c * q1 - q2 + signal[i];
    q2 = q1;
    q1 = q0;
  }
  return q1 * q1 + q2 * q2 - c * q1 * q2;
}

/** Potência média em uma banda [fLo, fHi] (Hz) dada fs (Hz). */
function bandPower(signal: number[], fLo: number, fHi: number, fs: number): number {
  const N = signal.length;
  const nyquist = fs / 2;
  const hi = Math.min(fHi, nyquist);
  if (fLo >= nyquist || N < 8) return 0;
  const kLo = Math.max(1, Math.floor((fLo * N) / fs));
  const kHi = Math.min(Math.floor(N / 2), Math.ceil((hi * N) / fs));
  if (kHi < kLo) return 0;
  let total = 0;
  for (let k = kLo; k <= kHi; k++) total += goertzelPower(signal, k);
  return total / (kHi - kLo + 1);
}

/** Centraliza o sinal (remove DC) e normaliza para amplitude unitária. */
function detrend(signal: number[]): number[] {
  if (!signal.length) return signal;
  const mean = signal.reduce((a, b) => a + b, 0) / signal.length;
  return signal.map((v) => v - mean);
}

function computeBandPowers(signal: number[], fs: number): BandPowers {
  const s = detrend(signal);
  return {
    delta: bandPower(s, ...BAND_RANGES.delta, fs),
    theta: bandPower(s, ...BAND_RANGES.theta, fs),
    alpha: bandPower(s, ...BAND_RANGES.alpha, fs),
    beta:  bandPower(s, ...BAND_RANGES.beta,  fs),
    gamma: bandPower(s, ...BAND_RANGES.gamma, fs),
  };
}

function relativize(bp: BandPowers): BandPowers {
  const total = bp.delta + bp.theta + bp.alpha + bp.beta + bp.gamma;
  if (total <= 0) return { delta: 0, theta: 0, alpha: 0, beta: 0, gamma: 0 };
  return {
    delta: bp.delta / total,
    theta: bp.theta / total,
    alpha: bp.alpha / total,
    beta:  bp.beta  / total,
    gamma: bp.gamma / total,
  };
}

/** Estima a frequência dominante (Hz) via varredura de DFT. */
function dominantFrequency(signal: number[], fs: number): number {
  const s = detrend(signal);
  const N = s.length;
  if (N < 8) return 0;
  const kMax = Math.floor(N / 2);
  let bestK = 1;
  let bestP = -Infinity;
  // varredura dos bins relevantes (até ~80 Hz) para performance
  const kLimit = Math.min(kMax, Math.ceil((80 * N) / fs));
  for (let k = 1; k <= kLimit; k++) {
    const p = goertzelPower(s, k);
    if (p > bestP) { bestP = p; bestK = k; }
  }
  return (bestK * fs) / N;
}

// ---------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------
export function computeMetrics(
  signal: number[],
  peakSensitivity: number,
  epochDurationSec = defaultThresholds.epochDurationSec,
): SignalMetrics {
  if (!signal.length) {
    return {
      variance: 0, meanAmplitude: 0, peakCount: 0,
      dominantFrequency: 0,
      bandPowers: { delta: 0, theta: 0, alpha: 0, beta: 0, gamma: 0 },
      relativeBandPowers: { delta: 0, theta: 0, alpha: 0, beta: 0, gamma: 0 },
      samplingRate: 0,
    };
  }

  const samplingRate = signal.length / Math.max(0.1, epochDurationSec);

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
    ) peakCount++;
  }

  const bandPowers = computeBandPowers(signal, samplingRate);
  const relativeBandPowers = relativize(bandPowers);
  const domF = dominantFrequency(signal, samplingRate);

  return {
    variance,
    meanAmplitude,
    peakCount,
    dominantFrequency: domF,
    bandPowers,
    relativeBandPowers,
    samplingRate,
  };
}

/**
 * Classificação calibrada por bandas de frequência:
 *  - Vigília:  EMG ativo (alpha+beta+gamma altos no canal muscular) OU EEG beta dominante
 *  - REM:      EMG quase inerte + EEG theta dominante (memória/hipocampo)
 *  - SWS:      EEG delta dominante + EMG inerte
 */
export function classify(
  eeg: SignalMetrics,
  emg: SignalMetrics,
  t: Thresholds,
): Classification {
  const emgActivity =
    emg.relativeBandPowers.alpha + emg.relativeBandPowers.beta + emg.relativeBandPowers.gamma;

  // Vigília: atividade muscular alta OU EEG dominado por beta
  if (emgActivity >= t.emgActivityThreshold) return "Wakefulness";
  if (eeg.relativeBandPowers.beta > 0.35 && eeg.relativeBandPowers.delta < 0.25)
    return "Wakefulness";

  // SWS: delta dominante
  if (eeg.relativeBandPowers.delta >= t.deltaDominanceThreshold) return "Slow-Wave Sleep";

  // REM: theta dominante com EMG inerte
  if (eeg.relativeBandPowers.theta >= t.thetaDominanceThreshold) return "REM";

  // Desempate: maior banda lenta vence
  return eeg.relativeBandPowers.delta >= eeg.relativeBandPowers.theta
    ? "Slow-Wave Sleep"
    : "REM";
}

export function classificationToBinary(c: Classification) {
  return {
    Sono_ondas_lentas: c === "Slow-Wave Sleep" ? 1 : 0,
    REM: c === "REM" ? 1 : 0,
    Vigilia: c === "Wakefulness" ? 1 : 0,
  };
}

// =====================================================================
// ECoG / Memória traumática — agora calibrado por bandas
// =====================================================================

export type MemoryPattern =
  | "Consolidação de Memória (SWS dominante)"
  | "Reprocessamento Emocional (REM dominante)"
  | "Hipervigilância / Reativação Traumática"
  | "Padrão Inconclusivo";

export type CMCLevel = "Baixa" | "Moderada" | "Alta";

export interface ECoGAnalysis {
  metrics: SignalMetrics;
  /** Proxies derivados das bandas reais. */
  slowOscillationIndex: number; // potência relativa em delta
  fastOscillationIndex: number; // potência relativa em gamma
  burstDensity: number;         // picos por 1000 amostras
  thetaGammaCoupling: number;   // proxy: theta * gamma (0..1)
  memoryPattern: MemoryPattern;
  consolidationScore: number;   // 0..1
  cmcReferenceLevel: CMCLevel;
  cmcFreezingEstimate: number;  // %
}

/**
 * Análise de ECoG com calibração de frequência:
 *  - Consolidação saudável  → delta alto, gamma moderado, baixa burst density
 *  - Reprocessamento REM    → theta alto, theta-gamma coupling moderado
 *  - Hipervigilância        → gamma alto + bursts frequentes + delta baixo
 *  CMC (Condicionamento de Medo ao Contexto): inverso à consolidação,
 *  modulado pela hipervigilância (gamma + bursts).
 */
export function analyzeECoG(
  signal: number[],
  peakSensitivity = 0.05,
  epochDurationSec = defaultThresholds.epochDurationSec,
): ECoGAnalysis {
  const metrics = computeMetrics(signal, peakSensitivity, epochDurationSec);
  const r = metrics.relativeBandPowers;

  const slowOscillationIndex = r.delta;
  const fastOscillationIndex = r.gamma;
  const burstDensity = (metrics.peakCount / Math.max(1, signal.length)) * 1000;
  const thetaGammaCoupling = clamp01(r.theta * r.gamma * 4);

  const burstN = clamp01(burstDensity / 30);

  // Consolidação: delta forte, gamma moderado, poucos bursts
  const consolidationScore = clamp01(
    0.55 * slowOscillationIndex +
    0.25 * (1 - fastOscillationIndex) +
    0.20 * (1 - burstN),
  );

  let memoryPattern: MemoryPattern;
  if (fastOscillationIndex > 0.30 && burstN > 0.6 && slowOscillationIndex < 0.25) {
    memoryPattern = "Hipervigilância / Reativação Traumática";
  } else if (slowOscillationIndex > 0.40 && burstN < 0.5) {
    memoryPattern = "Consolidação de Memória (SWS dominante)";
  } else if (r.theta > 0.30 && fastOscillationIndex < 0.30) {
    memoryPattern = "Reprocessamento Emocional (REM dominante)";
  } else {
    memoryPattern = "Padrão Inconclusivo";
  }

  // CMC: hipervigilância eleva freezing teórico
  const cmcRaw = clamp01(0.55 * fastOscillationIndex + 0.25 * burstN + 0.20 * (1 - consolidationScore));
  const cmcFreezingEstimate = Math.round(cmcRaw * 100);
  const cmcReferenceLevel: CMCLevel =
    cmcRaw < 0.33 ? "Baixa" : cmcRaw < 0.66 ? "Moderada" : "Alta";

  return {
    metrics,
    slowOscillationIndex,
    fastOscillationIndex,
    burstDensity,
    thetaGammaCoupling,
    memoryPattern,
    consolidationScore,
    cmcReferenceLevel,
    cmcFreezingEstimate,
  };
}

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

/** Rótulo legível em português para cada banda. */
export const BAND_LABELS: Record<keyof BandPowers, string> = {
  delta: "Delta (0.5–4 Hz)",
  theta: "Theta (4–8 Hz)",
  alpha: "Alpha (8–13 Hz)",
  beta:  "Beta (13–30 Hz)",
  gamma: "Gamma (30–80 Hz)",
};
