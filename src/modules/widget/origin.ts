/** Exact http(s) origins only — no credentials, paths, or wildcards. */
export function normalizeOrigin(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    if (url.username || url.password) return null;
    if (url.pathname !== '/' || url.search || url.hash) {
      // Accept pasted URLs by reducing to origin only when path is empty-or-root.
      if (url.pathname !== '/' && url.pathname !== '') return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

export function parseOriginList(raw: unknown): string[] {
  const lines = Array.isArray(raw)
    ? raw.map(String)
    : String(raw ?? '')
        .split(/[\n,]+/)
        .map((line) => line.trim())
        .filter(Boolean);
  const origins = lines.map(normalizeOrigin);
  if (origins.some((origin) => !origin)) throw new Error('INVALID_ORIGIN');
  const unique = [...new Set(origins as string[])];
  if (unique.length > 20) throw new Error('TOO_MANY_ORIGINS');
  return unique;
}

export function originAllowed(allowed: readonly string[], originHeader: string | null): boolean {
  if (!originHeader) return false;
  const origin = normalizeOrigin(originHeader);
  return !!origin && allowed.includes(origin);
}
