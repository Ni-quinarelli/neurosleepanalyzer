import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

export interface RecordMeta {
  subject: string;
  group: string;
  collectedAt: string; // datetime-local string
  epoch: string;
}

export const emptyMeta: RecordMeta = { subject: "", group: "", collectedAt: "", epoch: "" };

export function MetadataForm({
  value,
  onChange,
}: {
  value: RecordMeta;
  onChange: (v: RecordMeta) => void;
}) {
  const set = (k: keyof RecordMeta) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...value, [k]: e.target.value });

  return (
    <Card className="p-4">
      <p className="mb-3 text-sm font-medium">Metadados do registro</p>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1">
          <Label htmlFor="m-subject" className="text-xs">Sujeito</Label>
          <Input id="m-subject" value={value.subject} onChange={set("subject")} placeholder="ex: Rato 12" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="m-group" className="text-xs">Grupo</Label>
          <Input id="m-group" value={value.group} onChange={set("group")} placeholder="ex: Controle / CMC" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="m-collected" className="text-xs">Data e hora da coleta</Label>
          <Input id="m-collected" type="datetime-local" value={value.collectedAt} onChange={set("collectedAt")} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="m-epoch" className="text-xs">Época</Label>
          <Input id="m-epoch" value={value.epoch} onChange={set("epoch")} placeholder="ex: pré / pós / E1" />
        </div>
      </div>
    </Card>
  );
}
