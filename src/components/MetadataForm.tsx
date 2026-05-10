import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

export interface RecordMeta {
  subject: string;
  group: string;
  collectedAt: string; // datetime-local string
  epoch: string;
  /** Taxa de amostragem em Hz (opcional). Quando informado, melhora a precisão da análise espectral. */
  samplingRate?: string;
}

export const emptyMeta: RecordMeta = { subject: "", group: "", collectedAt: "", epoch: "", samplingRate: "" };

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
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
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
          <Input id="m-collected" type="datetime-local" step="1" value={value.collectedAt} onChange={set("collectedAt")} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="m-epoch" className="text-xs">Época</Label>
          <Input id="m-epoch" value={value.epoch} onChange={set("epoch")} placeholder="ex: pré / pós / E1" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="m-fs" className="text-xs">Taxa amostragem (Hz)</Label>
          <Input id="m-fs" inputMode="decimal" value={value.samplingRate ?? ""} onChange={set("samplingRate")} placeholder="ex: 1000" />
        </div>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Dica: para análise mais precisa, informe a taxa de amostragem (Hz) e prefira upload de
        sinal bruto em <code>.csv</code>/<code>.txt</code> (uma amostra por linha) em vez de imagem.
      </p>
    </Card>
  );
}
