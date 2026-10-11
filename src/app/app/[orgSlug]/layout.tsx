import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Building2, ChevronDown, House, Plus, ShieldCheck } from 'lucide-react';
import { requireUser } from '@/server/session';
import { listWorkspaces, workspaceFor } from '@/modules/organizations/service';
import { AccessDenied } from '@/modules/organizations/policy';
import { switchOrganization } from '@/modules/organizations/actions';
import { Brand } from '@/components/brand';
import { AccountMenu } from '@/components/account-menu';
export default async function Layout({ children, params }: { children: React.ReactNode; params: Promise<{ orgSlug: string }> }) {
 const user = await requireUser(); const { orgSlug } = await params;
 let org; try { org = await workspaceFor(user.id, orgSlug); } catch (e) { if (e instanceof AccessDenied) notFound(); throw e; }
 const workspaces = await listWorkspaces(user.id);
 return <div className="min-h-screen lg:grid lg:grid-cols-[230px_1fr]"><aside className="border-b border-input bg-[#f3f5f0] p-5 lg:flex lg:min-h-screen lg:flex-col lg:border-r lg:border-b-0"><div className="flex items-center justify-between"><Brand /><span className="text-[10px] tracking-wider text-muted-foreground">WORKSPACE</span></div><details className="relative mt-5"><summary className="flex list-none items-center gap-2 rounded-lg border border-input bg-background px-3 py-3 text-sm font-medium"><Building2 size={17} /><span className="min-w-0 flex-1 truncate">{org.name}</span><ChevronDown size={15} /></summary><div className="absolute top-full z-20 mt-2 w-full rounded-xl border border-input bg-background p-2 shadow-lg">{workspaces.map(w => <form action={switchOrganization} key={w.id}><input type="hidden" name="slug" value={w.slug} /><button className="w-full rounded-md px-2 py-2 text-left text-sm hover:bg-muted">{w.name}{w.slug === org.slug ? ' ✓' : ''}</button></form>)}<Link href="/organizations/new" className="mt-1 flex items-center gap-2 border-t border-input px-2 py-3 text-sm"><Plus size={14} /> New workspace</Link></div></details><nav className="mt-5" aria-label="Workspace navigation"><Link href={`/app/${org.slug}`} aria-current="page" className="flex items-center gap-3 rounded-lg bg-[#e0e9df] px-3 py-3 text-sm font-medium text-primary"><House size={18} /> Overview</Link></nav><div className="mt-auto hidden pt-8 lg:block"><ShieldCheck size={18} className="mb-2 text-primary" /><p className="text-xs leading-5 text-muted-foreground">A private workspace.<br />Access follows your membership.</p></div></aside><div className="min-w-0"><header className="flex h-16 items-center justify-between border-b border-input px-6 sm:px-8"><p className="text-sm text-muted-foreground">Workspace <span className="mx-2 text-input">/</span> <span className="text-foreground">Overview</span></p><AccountMenu name={user.name} /></header>{children}</div></div>;
}
