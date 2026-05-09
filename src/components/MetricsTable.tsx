import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BAND_LABELS, type BandPowers, type SignalMetrics } from "@/utils/signalAnalysis";

interface Props {
  eeg: SignalMetrics;
  emg: SignalMetrics;
}

export function MetricsTable({ eeg, emg }: Props) {
  const fmt = (n: number) => n.toFixed(4);
  const hz = (n: number) => `${n.toFixed(2)} Hz`;
  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Sinal</TableHead>
            <TableHead className="font-mono">Variância</TableHead>
            <TableHead className="font-mono">Amplitude Média</TableHead>
            <TableHead className="font-mono">Picos</TableHead>
            <TableHead className="font-mono">Freq. dominante</TableHead>
            <TableHead className="font-mono">fs estimada</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell className="font-medium">EEG</TableCell>
            <TableCell className="font-mono">{fmt(eeg.variance)}</TableCell>
            <TableCell className="font-mono">{fmt(eeg.meanAmplitude)}</TableCell>
            <TableCell className="font-mono">{eeg.peakCount}</TableCell>
            <TableCell className="font-mono">{hz(eeg.dominantFrequency)}</TableCell>
            <TableCell className="font-mono">{hz(eeg.samplingRate)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium">EMG</TableCell>
            <TableCell className="font-mono">{fmt(emg.variance)}</TableCell>
            <TableCell className="font-mono">{fmt(emg.meanAmplitude)}</TableCell>
            <TableCell className="font-mono">{emg.peakCount}</TableCell>
            <TableCell className="font-mono">{hz(emg.dominantFrequency)}</TableCell>
            <TableCell className="font-mono">{hz(emg.samplingRate)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <div className="grid gap-3 md:grid-cols-2">
        <BandBars title="EEG — distribuição espectral" bp={eeg.relativeBandPowers} />
        <BandBars title="EMG — distribuição espectral" bp={emg.relativeBandPowers} />
      </div>
    </div>
  );
}

const BAND_COLORS: Record<keyof BandPowers, string> = {
  delta: "bg-indigo-500",
  theta: "bg-violet-500",
  alpha: "bg-emerald-500",
  beta:  "bg-amber-500",
  gamma: "bg-rose-500",
};

export function BandBars({ title, bp }: { title: string; bp: BandPowers }) {
  const bands: (keyof BandPowers)[] = ["delta", "theta", "alpha", "beta", "gamma"];
  return (
    <div className="rounded border border-border bg-card p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <div className="space-y-1.5">
        {bands.map((b) => {
          const pct = Math.max(0, Math.min(1, bp[b])) * 100;
          return (
            <div key={b} className="flex items-center gap-2">
              <span className="w-32 text-[11px] text-muted-foreground">{BAND_LABELS[b]}</span>
              <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full ${BAND_COLORS[b]} transition-all`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-12 text-right font-mono text-[11px]">{pct.toFixed(1)}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
