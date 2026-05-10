import { Card } from "@/components/ui/card";
import { Brain, Zap, TrendingUp, AlertTriangle, BookOpen, Activity } from "lucide-react";
import type {
  SignalMetrics, Classification, ECoGAnalysis,
} from "@/utils/signalAnalysis";

type TraumaLevel = "Baixa" | "Moderada" | "Alta" | "Muito Alta";

interface OscRow {
  key: string;
  label: string;
  caption: string;
  metric: string;
  trauma: TraumaLevel;
  color: string;
}

interface TraumaInput {
  consolidationIndex: number; // 0..100
  phaseTitle: string;
  phaseDescription: string;
  clinicalNote: string;
  phaseTone: "wake" | "sws" | "rem" | "unknown";
  oscillations: OscRow[];
  cmc: {
    phase: string;
    freezingRange: string;
    probability: TraumaLevel;
    description: string;
  };
  /** ECOG Performance Status (0–4) derivado automaticamente do padrão neurofisiológico. */
  ecogPS: {
    grade: number;
    label: string;
    description: string;
    rationale: string;
  };
}

const ECOG_PS_TABLE: { grade: number; label: string; description: string }[] = [
  { grade: 0, label: "Totalmente ativo",   description: "Capaz de manter todas as atividades prévias, sem restrições." },
  { grade: 1, label: "Restrição leve",     description: "Restrições para atividades extenuantes; capaz de trabalho leve / sedentário." },
  { grade: 2, label: "Ambulante",          description: "Cuidados pessoais preservados; sem capacidade laboral; ativo > 50% do dia." },
  { grade: 3, label: "Cuidados limitados", description: "Cuidados pessoais limitados; acamado/sentado > 50% do dia." },
  { grade: 4, label: "Incapacitado",       description: "Totalmente incapacitado; sem autocuidado; confinado à cama/cadeira." },
  { grade: 5, label: "Óbito",              description: "Morte." },
];

/**
 * Estima o ECOG Performance Status (0–4) a partir do estado neurofisiológico.
 * Premissa: melhor consolidação + menor freezing/hipervigilância → menor
 * impacto funcional. Padrões inconclusivos elevam o grau por incerteza.
 * Grau 5 nunca é atribuído automaticamente (requer constatação clínica).
 */
function deriveEcogPS(
  consolidationIndex: number,   // 0..100
  freezingPct: number,          // 0..100
  tone: TraumaInput["phaseTone"],
): TraumaInput["ecogPS"] {
  const cons = Math.max(0, Math.min(100, consolidationIndex));
  const freeze = Math.max(0, Math.min(100, freezingPct));
  // 0 (ótimo) … 100 (péssimo)
  let impact = 0.55 * (100 - cons) + 0.45 * freeze;
  if (tone === "wake") impact += 10;     // hipervigilância pesa
  if (tone === "unknown") impact += 15;  // incerteza pesa
  impact = Math.max(0, Math.min(100, impact));

  let grade: number;
  if (impact < 18) grade = 0;
  else if (impact < 36) grade = 1;
  else if (impact < 55) grade = 2;
  else if (impact < 75) grade = 3;
  else grade = 4;

  const row = ECOG_PS_TABLE[grade];
  const rationale =
    `Derivado de Índice de Consolidação ${cons} e Congelamento estimado ${freeze}% ` +
    `(impacto funcional ${Math.round(impact)}/100, fase: ${tone}).`;

  return { grade, label: row.label, description: row.description, rationale };
}

// ---------- builders ----------

function levelFromValue(v: number, thresholds: [number, number, number]): TraumaLevel {
  if (v >= thresholds[2]) return "Muito Alta";
  if (v >= thresholds[1]) return "Alta";
  if (v >= thresholds[0]) return "Moderada";
  return "Baixa";
}

function freezingRange(pct: number): string {
  if (pct >= 70) return "70–90%";
  if (pct >= 50) return "50–70%";
  if (pct >= 30) return "30–50%";
  if (pct >= 10) return "10–30%";
  return "0–10%";
}

export function buildFromEEGEMG(
  eeg: SignalMetrics, emg: SignalMetrics, classification: Classification,
): TraumaInput {
  const r = eeg.relativeBandPowers;
  const emgAct = emg.relativeBandPowers.alpha + emg.relativeBandPowers.beta + emg.relativeBandPowers.gamma;
  const consolidationIndex = Math.round(
    Math.max(0, Math.min(1, 0.55 * r.delta + 0.25 * (1 - r.gamma) + 0.20 * (1 - emgAct))) * 100,
  );

  let phaseTitle: string, phaseDescription: string, clinicalNote: string, tone: TraumaInput["phaseTone"];
  if (classification === "Wakefulness") {
    phaseTitle = "Expressão / Reativação";
    phaseDescription = "Vigília com alta atividade muscular. O organismo está em estado de alerta. Memórias traumáticas podem estar sendo reativadas ou expressas comportamentalmente.";
    clinicalNote = "Monitorar padrões de hipervigilância. Intervenções terapêuticas durante vigília podem aproveitar janelas de reconsolidação.";
    tone = "wake";
  } else if (classification === "Slow-Wave Sleep") {
    phaseTitle = "Consolidação";
    phaseDescription = "Predomínio de ondas lentas (SWS). Janela neurofisiológica de transferência hipocampo→neocórtex e consolidação de memórias declarativas.";
    clinicalNote = "Estágio favorável à consolidação. Privação de SWS reduz integração de traços de memória traumática.";
    tone = "sws";
  } else {
    phaseTitle = "Reconsolidação / Reprocessamento";
    phaseDescription = "Predomínio de theta com EMG inerte (REM). Reprocessamento emocional e amígdala-hipocampo ativos — janela ideal para extinção do medo.";
    clinicalNote = "Fase REM aberta para reconsolidação. Distúrbios de REM associam-se a manutenção de memórias traumáticas (TEPT).";
    tone = "rem";
  }

  const swrCount = Math.round((r.gamma * eeg.peakCount) / 4);
  const thetaPct = Math.round(r.theta * 100);
  const spindles = Math.round((r.beta * eeg.peakCount) / 4);

  const oscillations: OscRow[] = [
    {
      key: "swr",
      label: "Sharp-Wave Ripples (SWR)",
      caption: "Replay hipocampal → consolidação de memória episódica e emocional",
      metric: String(swrCount),
      trauma: levelFromValue(swrCount, [2, 5, 10]),
      color: "bg-blue-500",
    },
    {
      key: "theta",
      label: "Oscilações Theta",
      caption: "Acoplamento amígdala-hipocampo → reconsolidação de memória de medo",
      metric: `${thetaPct}% ritmicidade`,
      trauma: levelFromValue(thetaPct, [20, 35, 45]),
      color: "bg-purple-500",
    },
    {
      key: "spindles",
      label: "Fusos do Sono (Sleep Spindles)",
      caption: "Integração neocortical de traços de memória durante NREM",
      metric: String(spindles),
      trauma: levelFromValue(spindles, [2, 5, 10]),
      color: "bg-teal-500",
    },
  ];

  // CMC mapping for EEG/EMG
  let cmcPhase: string, cmcDesc: string, cmcProb: TraumaLevel, freezingPct: number;
  if (classification === "Wakefulness") {
    cmcPhase = "Reativação / Expressão (Vigília)";
    cmcDesc = "Estado de vigília com EMG alto indica reatividade comportamental ativa. Alta expressão de medo esperada em teste CMC. Padrão compatível com hipervigilância (TEPT).";
    cmcProb = "Alta";
    freezingPct = 75;
  } else if (classification === "Slow-Wave Sleep") {
    cmcPhase = "Consolidação (SWS)";
    cmcDesc = "Predomínio de ondas lentas favorece consolidação saudável. Baixa expressão de medo esperada — extinção bem integrada.";
    cmcProb = "Baixa";
    freezingPct = 20;
  } else {
    cmcPhase = "Reconsolidação (REM)";
    cmcDesc = "Janela REM ativa para reprocessamento emocional. Resposta de freezing intermediária esperada conforme estágio do paradigma CMC.";
    cmcProb = "Moderada";
    freezingPct = 45;
  }

  return {
    consolidationIndex,
    phaseTitle, phaseDescription, clinicalNote, phaseTone: tone,
    oscillations,
    cmc: { phase: cmcPhase, freezingRange: freezingRange(freezingPct), probability: cmcProb, description: cmcDesc },
  };
}

export function buildFromECoG(a: ECoGAnalysis): TraumaInput {
  const r = a.metrics.relativeBandPowers;
  const consolidationIndex = Math.round(a.consolidationScore * 100);

  let phaseTitle: string, phaseDescription: string, clinicalNote: string, tone: TraumaInput["phaseTone"];
  if (a.memoryPattern === "Hipervigilância / Reativação Traumática") {
    phaseTitle = "Expressão / Reativação";
    phaseDescription = "Atividade gamma elevada e bursts frequentes indicam hipervigilância cortical. Memórias traumáticas em estado reativado.";
    clinicalNote = "Padrão compatível com TEPT. Considerar intervenções durante janelas de reconsolidação.";
    tone = "wake";
  } else if (a.memoryPattern === "Consolidação de Memória (SWS dominante)") {
    phaseTitle = "Consolidação";
    phaseDescription = "Ondas lentas dominantes — fase neurofisiológica de transferência hipocampo→neocórtex.";
    clinicalNote = "Estágio favorável à consolidação saudável e à integração de traços emocionais.";
    tone = "sws";
  } else if (a.memoryPattern === "Reprocessamento Emocional (REM dominante)") {
    phaseTitle = "Reconsolidação / Reprocessamento";
    phaseDescription = "Theta dominante sugere acoplamento amígdala-hipocampo ativo — janela ideal para extinção do medo.";
    clinicalNote = "Fase REM aberta para reconsolidação. Boa janela para intervenções de extinção.";
    tone = "rem";
  } else {
    phaseTitle = "Padrão Inconclusivo";
    phaseDescription = "Distribuição espectral mista — nenhuma banda dominou o suficiente para classificar a fase.";
    clinicalNote = "Recomenda-se nova coleta com taxa de amostragem informada e épocas mais longas.";
    tone = "unknown";
  }

  const swrCount = Math.round(a.burstDensity / 2);
  const thetaPct = Math.round(r.theta * 100);
  const spindles = Math.round((r.beta * a.metrics.peakCount) / 4);

  const oscillations: OscRow[] = [
    {
      key: "swr",
      label: "Sharp-Wave Ripples (SWR)",
      caption: "Replay hipocampal → consolidação de memória episódica e emocional",
      metric: String(swrCount),
      trauma: levelFromValue(swrCount, [2, 5, 10]),
      color: "bg-blue-500",
    },
    {
      key: "theta",
      label: "Oscilações Theta",
      caption: "Acoplamento amígdala-hipocampo → reconsolidação de memória de medo",
      metric: `${thetaPct}% ritmicidade`,
      trauma: levelFromValue(thetaPct, [20, 35, 45]),
      color: "bg-purple-500",
    },
    {
      key: "spindles",
      label: "Fusos do Sono (Sleep Spindles)",
      caption: "Integração neocortical de traços de memória durante NREM",
      metric: String(spindles),
      trauma: levelFromValue(spindles, [2, 5, 10]),
      color: "bg-teal-500",
    },
  ];

  return {
    consolidationIndex,
    phaseTitle, phaseDescription, clinicalNote, phaseTone: tone,
    oscillations,
    cmc: {
      phase: a.memoryPattern === "Hipervigilância / Reativação Traumática"
        ? "Reativação / Expressão (Vigília)"
        : a.memoryPattern === "Consolidação de Memória (SWS dominante)"
          ? "Consolidação (SWS)"
          : a.memoryPattern === "Reprocessamento Emocional (REM dominante)"
            ? "Reconsolidação (REM)"
            : "Padrão Inconclusivo",
      freezingRange: freezingRange(a.cmcFreezingEstimate),
      probability: a.cmcReferenceLevel === "Alta" ? "Alta" : a.cmcReferenceLevel === "Moderada" ? "Moderada" : "Baixa",
      description:
        a.cmcReferenceLevel === "Alta"
          ? "Padrão cortical compatível com hipervigilância. Alta expressão de medo esperada em teste CMC."
          : a.cmcReferenceLevel === "Moderada"
            ? "Padrão intermediário — resposta de freezing variável conforme estágio do paradigma."
            : "Padrão de baixa expressão de medo. Consolidação/extinção bem integrada.",
    },
  };
}

// ---------- UI ----------

const phaseStyles: Record<TraumaInput["phaseTone"], { bg: string; iconBg: string; icon: React.ReactNode }> = {
  wake:    { bg: "bg-purple-50/60 border-purple-200", iconBg: "bg-orange-100 text-orange-600", icon: <Zap className="h-5 w-5" /> },
  sws:     { bg: "bg-blue-50/60 border-blue-200",     iconBg: "bg-blue-100 text-blue-600",     icon: <Brain className="h-5 w-5" /> },
  rem:     { bg: "bg-violet-50/60 border-violet-200", iconBg: "bg-violet-100 text-violet-600", icon: <Activity className="h-5 w-5" /> },
  unknown: { bg: "bg-muted/40 border-border",         iconBg: "bg-muted text-foreground",      icon: <Brain className="h-5 w-5" /> },
};

const traumaBadge: Record<TraumaLevel, string> = {
  "Baixa":      "border-emerald-300 bg-emerald-50 text-emerald-700",
  "Moderada":   "border-amber-300 bg-amber-50 text-amber-700",
  "Alta":       "border-orange-300 bg-orange-50 text-orange-700",
  "Muito Alta": "border-red-300 bg-red-50 text-red-700",
};

export function TraumaPatternsCard({ data }: { data: TraumaInput }) {
  const ps = phaseStyles[data.phaseTone];
  return (
    <div className="space-y-4">
      <Card className="space-y-4 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 text-purple-700">
            <Brain className="h-5 w-5" />
          </div>
          <div>
            <p className="text-base font-semibold">Padrões de Memória Traumática</p>
            <p className="text-xs text-muted-foreground">EEG + ECoG · Consolidação, reconsolidação e extinção do medo</p>
          </div>
        </div>

        <div className={`rounded-lg border p-4 ${ps.bg}`}>
          <div className="flex items-start gap-3">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${ps.iconBg}`}>
              {ps.icon}
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Fase de Processamento de Memória
              </p>
              <p className="text-lg font-semibold">{data.phaseTitle}</p>
              <p className="text-sm text-muted-foreground">{data.phaseDescription}</p>
            </div>
          </div>
          <div className="mt-3 flex items-start gap-2 rounded-md border border-border bg-background/70 p-3">
            <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-xs leading-relaxed">
              <span className="font-semibold">Nota clínica:</span> {data.clinicalNote}
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-border p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="flex items-center gap-2 text-sm font-medium">
              <TrendingUp className="h-4 w-4 text-blue-600" /> Índice de Consolidação de Memória
            </p>
            <p className="text-2xl font-bold text-blue-600">{data.consolidationIndex}</p>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-600"
              style={{ width: `${Math.max(2, Math.min(100, data.consolidationIndex))}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
            <span>Baixa atividade</span>
            <span>Alta atividade oscilatória</span>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Padrões Oscilatórios Detectados
        </p>
        <div className="divide-y divide-border">
          {data.oscillations.map((o) => (
            <div key={o.key} className="flex items-start justify-between gap-3 py-3">
              <div className="flex items-start gap-2">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${o.color}`} />
                <div>
                  <p className="text-sm font-medium">{o.label}</p>
                  <p className="text-xs text-muted-foreground">{o.caption}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="font-mono text-xs">{o.metric}</span>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${traumaBadge[o.trauma]}`}>
                  Trauma: {o.trauma}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="space-y-2 border-red-200 bg-red-50/40 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <p className="text-[11px] font-semibold uppercase tracking-wider text-red-700">
            Escala CMC Teórica · Condicionamento de Medo ao Contexto
          </p>
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${traumaBadge[data.cmc.probability]}`}>
            Probabilidade {data.cmc.probability}
          </span>
        </div>
        <p className="text-base font-semibold">{data.cmc.phase}</p>
        <div className="inline-flex rounded-md border border-border bg-background px-3 py-2 text-sm">
          Congelamento estimado: <span className="ml-1 font-mono font-semibold">{data.cmc.freezingRange}</span>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">{data.cmc.description}</p>
      </Card>
    </div>
  );
}
