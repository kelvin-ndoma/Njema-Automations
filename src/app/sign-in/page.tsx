import { AuthScreen } from '@/components/auth-screen';
export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return <AuthScreen next={(await searchParams).next} />;
}
