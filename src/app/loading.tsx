export default function Loading() {
  return (
    <main role="status" className="mx-auto max-w-4xl animate-pulse px-6 py-12">
      <p className="text-sm text-muted-foreground">Loading…</p>
      <div className="mt-5 h-8 w-64 rounded bg-muted" />
      <div className="mt-6 h-48 rounded-xl bg-muted" />
    </main>
  );
}
