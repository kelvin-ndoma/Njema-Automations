import Link from 'next/link';
export default function NotFound() {
  return (
    <section className="py-12">
      <h1 className="text-2xl font-semibold">Platform resource unavailable.</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        This resource does not exist or your account does not have access.
      </p>
      <Link href="/organizations" className="mt-5 inline-block text-sm font-medium text-primary">
        Return to workspaces →
      </Link>
    </section>
  );
}
