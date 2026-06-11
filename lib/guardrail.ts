// Enforced server-side before any query runs. Rejects anything that isn't a single SELECT.
export function validateReadOnly(q: string): { ok: boolean; reason: string } {
  const trimmed = q.trim().replace(/;+\s*$/, "");
  if (!/^select\b/i.test(trimmed)) return { ok: false, reason: "Query does not begin with SELECT." };
  if (/;/.test(trimmed)) return { ok: false, reason: "Multiple statements detected." };
  if (/\b(insert|update|delete|drop|alter|create|merge|truncate|grant)\b/i.test(trimmed))
    return { ok: false, reason: "Contains a write/DDL keyword." };
  return { ok: true, reason: "Single read-only SELECT verified." };
}
