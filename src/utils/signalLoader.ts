import { extractSingleSignal } from "./imageProcessor";

/**
 * Carrega um sinal a partir de arquivo. Suporta:
 *   - Imagens (PNG/JPG): extrai série temporal do traçado.
 *   - CSV / TXT: aceita uma coluna numérica (vírgula, ponto-e-vírgula, tab ou
 *     quebra de linha como separador). Usa a primeira coluna numérica
 *     encontrada e ignora cabeçalhos.
 */
export async function loadSignal(file: File): Promise<number[]> {
  const name = file.name.toLowerCase();
  const isText = /\.(csv|txt|tsv|dat)$/.test(name) || /^text\//.test(file.type);
  if (isText) {
    const text = await file.text();
    return parseNumericText(text);
  }
  return extractSingleSignal(file);
}

export function parseNumericText(text: string): number[] {
  const lines = text.split(/\r?\n/);
  const out: number[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    // pega primeira "célula" numérica de cada linha
    const cells = line.split(/[,;\t\s]+/);
    for (const c of cells) {
      const n = Number(c.replace(",", "."));
      if (Number.isFinite(n)) {
        out.push(n);
        break; // só primeira coluna numérica por linha
      }
    }
  }
  // Normaliza para 0..1 (mesma escala dos sinais extraídos de imagem)
  if (out.length === 0) return out;
  let min = Infinity, max = -Infinity;
  for (const v of out) { if (v < min) min = v; if (v > max) max = v; }
  const range = max - min;
  if (range === 0) return out.map(() => 0.5);
  return out.map((v) => (v - min) / range);
}
