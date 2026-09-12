export function buildSubject(base: string, prefix?: string): string {
  if (!prefix?.trim()) {
    return base;
  }

  return `${prefix.trim()} — ${base}`;
}
