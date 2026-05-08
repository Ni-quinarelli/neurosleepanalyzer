import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

interface Props {
  data: number[];
  color: string;
  label: string;
}

export function SignalChart({ data, color, label }: Props) {
  // Downsample for performance
  const step = Math.max(1, Math.floor(data.length / 600));
  const points = data
    .filter((_, i) => i % step === 0)
    .map((v, i) => ({ x: i * step, y: Number(v.toFixed(4)) }));

  return (
    <div className="h-48 w-full">
      <p className="mb-1 font-mono text-xs text-muted-foreground">{label}</p>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
          <XAxis dataKey="x" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
          <YAxis domain={[0, 1]} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
              fontSize: 12,
            }}
          />
          <Line type="monotone" dataKey="y" stroke={color} dot={false} strokeWidth={1.2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
