import type { Classification } from "@/utils/signalAnalysis";

const labels: Record<Classification, string> = {
  "Slow-Wave Sleep": "Sono de Ondas Lentas",
  REM: "Sono REM",
  Wakefulness: "Vigília",
};

const styles: Record<Classification, string> = {
  "Slow-Wave Sleep": "bg-blue-100 text-blue-800 border-blue-300",
  REM: "bg-purple-100 text-purple-800 border-purple-300",
  Wakefulness: "bg-orange-100 text-orange-800 border-orange-300",
};

export function classificationLabel(value: Classification) {
  return labels[value];
}

export function ClassificationBadge({ value }: { value: Classification }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-semibold ${styles[value]}`}
    >
      {labels[value]}
    </span>
  );
}
