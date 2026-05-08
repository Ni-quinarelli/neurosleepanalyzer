import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { SignalMetrics } from "@/utils/signalAnalysis";

interface Props {
  eeg: SignalMetrics;
  emg: SignalMetrics;
}

export function MetricsTable({ eeg, emg }: Props) {
  const fmt = (n: number) => n.toFixed(4);
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Sinal</TableHead>
          <TableHead className="font-mono">Variância</TableHead>
          <TableHead className="font-mono">Amplitude Média</TableHead>
          <TableHead className="font-mono">Picos</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell className="font-medium">EEG</TableCell>
          <TableCell className="font-mono">{fmt(eeg.variance)}</TableCell>
          <TableCell className="font-mono">{fmt(eeg.meanAmplitude)}</TableCell>
          <TableCell className="font-mono">{eeg.peakCount}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell className="font-medium">EMG</TableCell>
          <TableCell className="font-mono">{fmt(emg.variance)}</TableCell>
          <TableCell className="font-mono">{fmt(emg.meanAmplitude)}</TableCell>
          <TableCell className="font-mono">{emg.peakCount}</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}
