export default function Loading() {
  return (
    <main role="status" className="mx-auto flex min-h-[50vh] max-w-md flex-col justify-center px-6">
      <p className="text-sm font-medium text-foreground">Finishing sign-in…</p>
      <p className="mt-2 text-sm text-muted-foreground">
        Checking your account and opening the right workspace. This can take a few seconds on the
        first request.
      </p>
      <div className="mt-6 h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-primary/70" />
      </div>
    </main>
  );
}
