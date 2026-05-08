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
            Adjust thresholds
          </span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-5 px-4 pb-4">
        <Field
          label="EEG variance threshold"
          value={thresholds.eegVariance}
          min={0.005}
          max={0.1}
          step={0.001}
          onChange={(v) => set("eegVariance", v)}
        />
        <Field
          label="EMG amplitude threshold"
          value={thresholds.emgAmplitude}
          min={0.05}
          max={0.4}
          step={0.005}
          onChange={(v) => set("emgAmplitude", v)}
        />
        <Field
          label="Peak detection sensitivity"
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
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex justify-between text-xs">
        <span className="text-foreground">{label}</span>
        <span className="font-mono text-muted-foreground">{value.toFixed(3)}</span>
      </div>
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
