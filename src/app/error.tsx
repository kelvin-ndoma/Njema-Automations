'use client';
import { Button } from '@/components/ui/button';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto max-w-md px-6 py-20">
      <h1 className="text-2xl font-semibold">We couldn’t load this page.</h1>
      <p className="my-4 text-sm leading-6 text-muted-foreground">
        Check your connection and try again. If the issue continues, ask your workspace
        administrator to check the service configuration.
      </p>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
