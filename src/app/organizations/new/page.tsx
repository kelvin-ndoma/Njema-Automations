import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireUser } from '@/server/session';
import { Brand } from '@/components/brand';
import { OrganizationForm } from '@/components/organization-form';
export default async function Page() { await requireUser(); return <main className="mx-auto max-w-xl px-6 py-8"><Brand /><Link href="/organizations" className="mb-7 mt-8 flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft size={16} /> Workspaces</Link><p className="text-xs font-semibold uppercase tracking-[.18em] text-primary">A foundation for growth</p><h1 className="mt-3 text-3xl font-semibold tracking-tight">Create your workspace.</h1><p className="mb-7 mt-3 text-sm leading-6 text-muted-foreground">Give your business a home. Choose the regional settings that fit how you operate.</p><OrganizationForm /></main>; }
