import { useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  label: string;
  file: File | null;
  preview: string | null;
  onFile: (file: File | null) => void;
  hint?: string;
}

export function SingleUpload({ label, file, preview, onFile, hint }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const handle = (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    if (!/image\/(png|jpeg|jpg)/.test(f.type)) return;
    onFile(f);
  };

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
      className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors ${
        drag ? "border-primary bg-accent" : "border-border bg-card"
      }`}
    >
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      {preview ? (
        <div className="w-full">
          <img
            src={preview}
            alt={label}
            className="max-h-44 w-full rounded border border-border object-contain"
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="truncate text-xs text-muted-foreground">{file?.name}</p>
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
          <Upload className="mb-2 h-7 w-7 text-muted-foreground" />
          <p className="mb-1 text-xs text-muted-foreground">Arraste ou selecione</p>
          {hint && (
            <p className="mb-3 text-center text-[10px] text-muted-foreground">{hint}</p>
          )}
          <Button size="sm" onClick={() => inputRef.current?.click()}>
            Escolher arquivo
          </Button>
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg"
        className="hidden"
        onChange={(e) => handle(e.target.files)}
      />
    </div>
  );
}
