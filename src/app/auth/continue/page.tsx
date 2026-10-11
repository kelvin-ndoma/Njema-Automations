import { redirect } from 'next/navigation';
import { resolveLanding } from '@/server/landing';
export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  redirect(await resolveLanding((await searchParams).next));
}
