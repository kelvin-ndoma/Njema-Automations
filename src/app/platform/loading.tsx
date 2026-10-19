export default function Loading() {
  return (
    <div role="status" className="animate-pulse space-y-4">
      <p className="text-sm text-muted-foreground">Loading platform data…</p>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div className="h-24 rounded-xl bg-muted" />
        <div className="h-24 rounded-xl bg-muted" />
        <div className="h-24 rounded-xl bg-muted" />
        <div className="h-24 rounded-xl bg-muted" />
      </div>
      <div className="h-64 rounded-xl bg-muted" />
    </div>
  );
}
