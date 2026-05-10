import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Activity } from "lucide-react";

/**
 * ECOG Performance Status (Eastern Cooperative Oncology Group) — escala
 * clínica funcional 0–5. Aqui é usada como REFERÊNCIA COMPLEMENTAR ao
 * traçado de ECoG: avalia o estado funcional global do sujeito e ajuda a
 * contextualizar os padrões neurofisiológicos detectados (consolidação,
 * hipervigilância etc.). Não é derivada do sinal — é uma classificação
 * manual feita pelo pesquisador/clínico.
 *
 * Fonte: ECOG-ACRIN Cancer Research Group.
 */

export const ECOG_PS_SCALE: { grade: number; label: string; description: string }[] = [
  { grade: 0, label: "Totalmente ativo",       description: "Capaz de manter todas as atividades que realizava antes da doença, sem restrições." },
  { grade: 1, label: "Restrição leve",         description: "Restrições para atividades extenuantes; capaz de se locomover e realizar trabalhos leves ou sedentários (ex.: tarefas domésticas leves, escritório)." },
  { grade: 2, label: "Ambulante",              description: "Capaz de todos os cuidados pessoais, mas incapaz de exercer atividade laboral; em pé/ativo por mais de 50% das horas acordado." },
  { grade: 3, label: "Cuidados limitados",     description: "Capaz apenas de cuidados pessoais limitados; permanece acamado ou sentado por mais de 50% das horas acordado." },
  { grade: 4, label: "Incapacitado",           description: "Completamente incapacitado; incapaz de qualquer autocuidado; totalmente confinado à cama ou cadeira." },
  { grade: 5, label: "Óbito",                  description: "Morte." },
];

export function gradeColor(grade: number | undefined) {
  if (grade === undefined || grade === null || Number.isNaN(grade)) return "bg-muted text-muted-foreground border-border";
  if (grade <= 1) return "bg-green-100 text-green-800 border-green-300";
  if (grade === 2) return "bg-yellow-100 text-yellow-800 border-yellow-300";
  if (grade === 3) return "bg-orange-100 text-orange-800 border-orange-300";
  return "bg-red-100 text-red-800 border-red-300";
}

interface Props {
  value?: string;            // string para casar com inputs do form
  onChange: (v: string) => void;
}

export function EcogPerformanceCard({ value, onChange }: Props) {
  const grade = value === "" || value === undefined ? undefined : Number(value);
  const current = ECOG_PS_SCALE.find((s) => s.grade === grade);

  return (
    <Card className="space-y-4 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-medium">
            <Activity className="h-4 w-4 text-primary" />
            ECOG Performance Status (referência clínica)
          </p>
          <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
            Escala funcional 0–5 do Eastern Cooperative Oncology Group. Use para
            contextualizar o estado global do sujeito ao lado do traçado de
            ECoG. <strong>Atenção:</strong> esta escala é distinta da
            eletrocorticografia (ECoG) — é uma medida clínica manual, não
            derivada do sinal.
          </p>
        </div>
        <div className="min-w-[220px] space-y-1">
          <Label htmlFor="ecog-ps" className="text-xs">Nota (0–5)</Label>
          <Select value={value ?? ""} onValueChange={(v) => onChange(v === "none" ? "" : v)}>
            <SelectTrigger id="ecog-ps">
              <SelectValue placeholder="Selecione…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Não informado</SelectItem>
              {ECOG_PS_SCALE.map((s) => (
                <SelectItem key={s.grade} value={String(s.grade)}>
                  {s.grade} — {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {current && (
            <span className={`mt-1 inline-block rounded-full border px-3 py-1 text-xs font-semibold ${gradeColor(current.grade)}`}>
              Grau {current.grade} — {current.label}
            </span>
          )}
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16 text-center">Nota</TableHead>
            <TableHead>Status de desempenho ECOG</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ECOG_PS_SCALE.map((s) => {
            const active = s.grade === grade;
            return (
              <TableRow key={s.grade} className={active ? "bg-primary/5" : ""}>
                <TableCell className="text-center font-mono">
                  <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold ${active ? gradeColor(s.grade) : "border-border"}`}>
                    {s.grade}
                  </span>
                </TableCell>
                <TableCell className="text-xs leading-relaxed">
                  <span className="font-medium">{s.label}.</span>{" "}
                  <span className="text-muted-foreground">{s.description}</span>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}
