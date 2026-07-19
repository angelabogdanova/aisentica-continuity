import Link from 'next/link';
import { BindDomainForm } from './bind-domain-form';
import { DevelopForm } from './develop-form';
import { ParkForm } from './park-form';
import { ReactivateForm } from './reactivate-form';
import { TransferForm } from './transfer-form';
import { ContinueForm } from './continue-form';
import { Lifecycle } from './lifecycle';
import type { AgentDetail, Event } from '@/lib/types';

function eventSummary(event: Event) {
  if (event.eventType === 'CREATE') return 'Initial Agent Manifest created.';
  if (event.eventType === 'BIND_DOMAIN') return `Verified canonical domain ${event.metadataJson.domain}.`;
  if (event.eventType === 'DEVELOP') return 'Developed durable professional state.';
  if (event.eventType === 'PARK') return 'Agent parked without deleting identity, domain, or state history.';
  if (event.eventType === 'REACTIVATE') return 'Agent reactivated with its complete parked checkpoint and prior history preserved.';
  if (event.eventType === 'TRANSFER') return 'Ownership transferred through an accepted single-use offer; the same Agent identity and state continued.';
  return 'Successor owner continued the same Agent from the transferred checkpoint without reset.';
}

export function AgentDetailView({ detail, privateView, currentDomain }: { detail: AgentDetail; privateView: boolean; currentDomain?: string }) {
  const { agent, owner, version, versions, events } = detail;
  const hasDevelopment = events.some((event) => event.eventType === 'DEVELOP');
  const hasReactivation = events.some((event) => event.eventType === 'REACTIVATE');
  const hasTransfer = events.some((event) => event.eventType === 'TRANSFER');
  const hasContinue = events.some((event) => event.eventType === 'CONTINUE');
  const canDevelop = privateView && agent.status === 'ACTIVE' && Boolean(agent.canonicalDomain) && agent.currentVersion >= 2;
  const canPark = privateView && agent.status === 'ACTIVE' && Boolean(agent.canonicalDomain) && hasDevelopment;
  const canReactivate = privateView && agent.status === 'PARKED';
  const canTransfer = privateView && agent.status === 'ACTIVE' && Boolean(agent.canonicalDomain) && hasReactivation;
  const canContinue = privateView && agent.status === 'TRANSFERRED' && version.versionType === 'TRANSFERRED';
  const latest = version.stateJson.latestDevelopment;
  const continuation = version.stateJson.latestContinuation;

  return <main className="mx-auto max-w-5xl px-5 py-12">
    <div className="flex flex-wrap justify-between gap-4">
      <div>
        <p className="eyebrow">{agent.id} · State version {agent.currentVersion}</p>
        <h1 className="mt-2 text-4xl font-bold">{agent.canonicalName}</h1>
        <p className="mt-2 text-zinc-400">{agent.role}</p>
      </div>
      {privateView&&<Link className="btn-muted" href={`/public/agents/${agent.id}`}>View public card</Link>}
    </div>

    <dl className="card mt-8 grid gap-4 sm:grid-cols-3">
      <div><dt className="text-xs text-zinc-500">Status</dt><dd>{agent.status}</dd></div>
      <div><dt className="text-xs text-zinc-500">Owner</dt><dd>{privateView?owner.displayName:'Not disclosed'}</dd></div>
      <div><dt className="text-xs text-zinc-500">Created</dt><dd>{new Date(agent.createdAt).toLocaleDateString()}</dd></div>
      <div className="sm:col-span-3"><dt className="text-xs text-zinc-500">Purpose</dt><dd>{agent.purpose}</dd></div>
      <div className="sm:col-span-3"><dt className="text-xs text-zinc-500">Canonical domain</dt><dd>{agent.canonicalDomain?<span className="inline-flex flex-wrap items-center gap-2"><span className="text-blue-300">Verified domain</span><span>{agent.canonicalDomain}</span></span>:'Not bound'}</dd></div>
    </dl>

    {privateView&&currentDomain&&!agent.canonicalDomain&&<BindDomainForm agentId={agent.id} domain={currentDomain}/>} 
    {canContinue&&<ContinueForm agentId={agent.id} name={agent.canonicalName}/>} 
    {canDevelop&&<DevelopForm agentId={agent.id} name={agent.canonicalName}/>} 
    {canPark&&<ParkForm agentId={agent.id} name={agent.canonicalName}/>} 
    {canReactivate&&<ReactivateForm agentId={agent.id} name={agent.canonicalName}/>} 
    {canTransfer&&<TransferForm agentId={agent.id} name={agent.canonicalName} currentOwnerId={owner.id}/>} 

    <section className="card mt-5">
      <h2 className="text-xl font-bold">{privateView?'Structured Agent State':'Public identity'}</h2>
      {privateView
        ? <pre className="mt-4 overflow-auto whitespace-pre-wrap text-sm text-zinc-300">{JSON.stringify(version.stateJson,null,2)}</pre>
        : <div className="mt-3 space-y-3 text-zinc-300"><p>{version.stateJson.publicIdentitySummary}</p>{latest&&<><span className="inline-block border border-red-500 px-2 py-1 text-xs text-red-200">Developed professional state</span><p>{latest.publicDevelopmentSummary}</p></>}{agent.status==='PARKED'&&<span className="inline-block border border-blue-600 px-2 py-1 text-xs text-blue-200">Parked · state preserved</span>}{agent.status==='ACTIVE'&&hasReactivation&&<span className="inline-block border border-emerald-600 px-2 py-1 text-xs text-emerald-200">Reactivated · continuity preserved</span>}{hasTransfer&&<span className="inline-block border border-violet-600 px-2 py-1 text-xs text-violet-200">Transferred · same Agent identity</span>}{hasContinue&&continuation&&<><span className="inline-block border border-cyan-600 px-2 py-1 text-xs text-cyan-200">Continued under successor ownership</span><p>{continuation.continuitySummary}</p></>}</div>}
    </section>

    {privateView&&<>
      <section className="card mt-5">
        <h2 className="text-xl font-bold">State timeline</h2>
        {events.map((event)=><div key={event.id} className="mt-4 border-l-2 border-red-500 pl-4"><b>v{event.metadataJson.version} · {event.eventType}</b><p className="text-sm text-zinc-400">{eventSummary(event)} {new Date(event.createdAt).toLocaleString()}</p></div>)}
      </section>
      <section className="card mt-5">
        <h2 className="text-xl font-bold">Version History</h2>
        <div className="mt-4 space-y-3">{versions.map((item)=><details key={item.id} className="border border-zinc-800 p-4" open={item.versionNumber===agent.currentVersion}><summary className="cursor-pointer font-semibold">Version {item.versionNumber} — {item.versionType} <span className="ml-2 text-xs font-normal text-zinc-500">{new Date(item.createdAt).toLocaleString()}</span></summary><p className="mt-2 text-sm text-zinc-400">{item.changeSummary}</p><pre className="mt-3 overflow-auto whitespace-pre-wrap text-xs text-zinc-300">{JSON.stringify(item.stateJson,null,2)}</pre></details>)}</div>
      </section>
      <section className="mt-5"><Lifecycle events={events}/></section>
    </>}
  </main>;
}
