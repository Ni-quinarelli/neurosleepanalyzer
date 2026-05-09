import { Brain } from "lucide-react";

interface Props {
  title?: string;
  subtitle?: string;
}

export function PageHeader({
  title = "NeuroSleep Analytica",
  subtitle = "EEG · EMG · ECoG · Memória Traumática · CMC",
}: Props) {
  return (
    <div className="mb-6 flex items-center gap-3 rounded-xl border border-border bg-gradient-to-br from-primary/5 via-background to-background p-4 shadow-sm">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
        <Brain className="h-6 w-6" />
      </div>
      <div className="leading-tight">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}
