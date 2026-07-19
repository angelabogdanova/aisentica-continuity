import Link from 'next/link';
import { requireOwner } from '@/lib/auth';
import { repository } from '@/lib/repository';
import { Lifecycle } from '@/components/lifecycle';
import { localFallbackEnabled } from '@/lib/ai';
import { storageBackend } from '@/lib/config';

export default async function Dashboard() {
  const owner = await requireOwner();
  const agents = await repository.byOwner(owner.id);

  return <main className="mx-auto max-w-6xl px-5 py-12">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="eyebrow">Active demo owner</p><h1 className="mt-2 text-4xl font-bold">{owner.displayName}</h1></div>
      <Link className="btn" href="/agents/new">Create Agent</Link>
    </div>
    {storageBackend()==='memory'&&<p className="mt-5 border border-zinc-600 bg-zinc-900 p-3 text-sm text-zinc-300">Temporary local memory storage — data will not persist across deployments.</p>}
    {localFallbackEnabled()&&<p className="mt-5 border border-amber-700 bg-amber-950/30 p-3 text-sm text-amber-200">Local deterministic fallback — no OpenAI API key is configured.</p>}
    <section className="mt-10">
      <h2 className="mb-4 text-xl font-bold">Owned agents</h2>
      {agents.length?<div className="grid gap-3">{agents.map((agent)=><Link key={agent.id} href={`/agents/${agent.id}`} className="card hover:border-blue-500">
        <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs text-red-400">{agent.id} · v{agent.currentVersion}</span><span className={`border px-2 py-1 text-xs ${agent.status==='PARKED'?'border-blue-600 text-blue-200':'border-emerald-700 text-emerald-200'}`}>{agent.status}</span></div>
        <h3 className="mt-1 text-xl font-bold">{agent.canonicalName}</h3><p className="text-zinc-400">{agent.role}</p>
        {agent.canonicalDomain&&<span className="mt-2 inline-block border border-blue-600 px-2 py-1 text-xs text-blue-300">Verified domain · {agent.canonicalDomain}</span>}
      </Link>)}</div>:<div className="card text-zinc-400">No agents yet. Create Atlas to establish its first immutable state version.</div>}
    </section>
    <section className="mt-10"><p className="eyebrow mb-3">Lifecycle</p><Lifecycle/></section>
  </main>;
}
