/** Exact origins only. Local aliases retain the configured protocol and port. */
export function authOrigins(baseURL: string): string[] {
  const url = new URL(baseURL);
  const origins = [url.origin];
  if (['localhost', '127.0.0.1'].includes(url.hostname)) {
    url.hostname = url.hostname === 'localhost' ? '127.0.0.1' : 'localhost';
    origins.push(url.origin);
  }
  return origins;
}
