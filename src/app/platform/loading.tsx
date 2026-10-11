export default function Loading() {
  return (
    <div role="status" className="animate-pulse">
      <p className="text-sm text-muted-foreground">Loading platform data…</p>
      <div className="mt-5 h-8 w-56 rounded bg-muted" />
      <div className="mt-6 h-48 rounded-xl bg-muted" />
    </div>
  );
}
