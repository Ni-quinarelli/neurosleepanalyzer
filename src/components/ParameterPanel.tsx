import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { ChevronDown, Settings2 } from "lucide-react";
import type { Thresholds } from "@/utils/signalAnalysis";

interface Props {
  thresholds: Thresholds;
  onChange: (t: Thresholds) => void;
}

export function ParameterPanel({ thresholds, onChange }: Props) {
  const set = <K extends keyof Thresholds>(k: K, v: number) =>
    onChange({ ...thresholds, [k]: v });

  return (
    <Collapsible className="rounded-lg border border-border bg-card">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="flex w-full items-center justify-between p-4">
          <span className="flex items-center gap-2 text-sm font-medium">
            <Settings2 className="h-4 w-4" />
            Calibração e limiares
          </span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-5 px-4 pb-4">
        <Field
          label="Janela temporal da imagem (segundos)"
          value={thresholds.epochDurationSec}
          min={1}
          max={60}
          step={0.5}
          onChange={(v) => set("epochDurationSec", v)}
          hint="Quantos segundos a imagem representa. Padrão = 10s (epoch de polissonografia). Calibração crítica para frequências em Hz."
        />
        <Field
          label="Limiar de atividade muscular EMG (vigília)"
          value={thresholds.emgActivityThreshold}
          min={0.1}
          max={0.7}
          step={0.01}
          onChange={(v) => set("emgActivityThreshold", v)}
        />
        <Field
          label="Dominância delta para SWS"
          value={thresholds.deltaDominanceThreshold}
          min={0.2}
          max={0.7}
          step={0.01}
          onChange={(v) => set("deltaDominanceThreshold", v)}
        />
        <Field
          label="Dominância theta para REM"
          value={thresholds.thetaDominanceThreshold}
          min={0.15}
          max={0.6}
          step={0.01}
          onChange={(v) => set("thetaDominanceThreshold", v)}
        />
        <Field
          label="Sensibilidade de detecção de picos"
          value={thresholds.peakSensitivity}
          min={0.01}
          max={0.2}
          step={0.005}
          onChange={(v) => set("peakSensitivity", v)}
        />
      </CollapsibleContent>
    </Collapsible>
  );
}

function Field({
  label, value, min, max, step, onChange, hint,
}: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; hint?: string;
}) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-foreground">{label}</span>
        <span className="font-mono text-muted-foreground">{value.toFixed(3)}</span>
      </div>
      {hint && <p className="mb-2 text-[10px] text-muted-foreground">{hint}</p>}
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onChange(v[0])}
      />
    </div>
  );
}
