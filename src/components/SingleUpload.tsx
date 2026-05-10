import { useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type Accent = "blue" | "green" | "orange" | "purple" | "teal" | "default";

interface Props {
  label: string;
  file: File | null;
  preview: string | null;
  onFile: (file: File | null) => void;
  hint?: string;
  accent?: Accent;
}

const ACCENTS: Record<Accent, { label: string; ring: string; iconBg: string; bg: string }> = {
  blue:    { label: "text-blue-700",    ring: "border-blue-300 hover:border-blue-400",       iconBg: "bg-blue-100 text-blue-700",       bg: "bg-blue-50/40" },
  green:   { label: "text-emerald-700", ring: "border-emerald-300 hover:border-emerald-400", iconBg: "bg-emerald-100 text-emerald-700", bg: "bg-emerald-50/40" },
  orange:  { label: "text-orange-700",  ring: "border-orange-300 hover:border-orange-400",   iconBg: "bg-orange-100 text-orange-700",   bg: "bg-orange-50/40" },
  purple:  { label: "text-purple-700",  ring: "border-purple-300 hover:border-purple-400",   iconBg: "bg-purple-100 text-purple-700",   bg: "bg-purple-50/40" },
  teal:    { label: "text-teal-700",    ring: "border-teal-300 hover:border-teal-400",       iconBg: "bg-teal-100 text-teal-700",       bg: "bg-teal-50/40" },
  default: { label: "text-foreground",  ring: "border-border hover:border-primary/40",       iconBg: "bg-muted text-foreground",        bg: "bg-card" },
};

export function SingleUpload({ label, file, preview, onFile, hint, accent = "default" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const a = ACCENTS[accent];

  const handle = (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    const isImg = /image\/(png|jpeg|jpg)/.test(f.type);
    const isText = /\.(csv|txt|tsv|dat)$/i.test(f.name);
    if (!isImg && !isText) return;
    onFile(f);
  };

  const isTextFile = file ? /\.(csv|txt|tsv|dat)$/i.test(file.name) : false;

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        handle(e.dataTransfer.files);
      }}
      className={`relative flex min-h-[220px] flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition-colors ${
        drag ? "border-primary bg-accent" : `${a.ring} ${a.bg}`
      }`}
    >
      <p className={`mb-3 text-xs font-bold uppercase tracking-wider ${a.label}`}>
        {label}
      </p>
      {file ? (
        <div className="w-full">
          {isTextFile || !preview ? (
            <div className="flex h-44 w-full items-center justify-center rounded border border-border bg-muted/30 text-center text-xs text-muted-foreground">
              <div>
                <p className="font-medium text-foreground">Sinal bruto</p>
                <p className="mt-1">{file.name}</p>
              </div>
            </div>
          ) : (
            <img
              src={preview}
              alt={label}
              className="max-h-44 w-full rounded border border-border object-contain"
            />
          )}
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="truncate text-xs text-muted-foreground">{file.name}</p>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onFile(null)}
              className="h-7 gap-1 text-xs"
            >
              <X className="h-3.5 w-3.5" /> Remover
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-lg ${a.iconBg}`}>
            <Upload className="h-6 w-6" />
          </div>
          <p className="mb-1 text-sm font-medium">Arraste ou clique</p>
          <p className="mb-3 text-[11px] text-muted-foreground">PNG / JPG · CSV / TXT</p>
          {hint && (
            <p className="mb-3 text-center text-[10px] text-muted-foreground">{hint}</p>
          )}
          <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()}>
            Escolher arquivo
          </Button>
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,.csv,.txt,.tsv,.dat,text/csv,text/plain"
        className="hidden"
        onChange={(e) => handle(e.target.files)}
      />
    </div>
  );
}
