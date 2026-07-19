import Link from 'next/link';
import { requireOwner } from '@/lib/auth';
import { repository } from '@/lib/repository';
import { Lifecycle } from '@/components/lifecycle';
import { localFallbackEnabled } from '@/lib/ai';
import { storageBackend } from '@/lib/config';

export default async function Dashboard() {
  const owner = await requireOwner();
  const agents = await repository.byOwner(owner.id);

  return <main className="site-shell page-frame">
    <header className="dashboard-header">
      <div>
        <p className="eyebrow">Active demo owner</p>
        <h1 className="dashboard-title">{owner.displayName}</h1>
      </div>
      <Link className="btn" href="/agents/new">Create Agent</Link>
    </header>

    {storageBackend() === 'memory' && <p className="notice">Temporary local memory storage — data will not persist across deployments.</p>}
    {localFallbackEnabled() && <p className="notice warning">Local deterministic fallback — no OpenAI API key is configured.</p>}

    <section style={{ marginTop: '48px' }}>
      <div className="registry-heading">
        <h2>Owned Agents</h2>
        <span className="mono">{String(agents.length).padStart(2, '0')} registered</span>
      </div>

      {agents.length ? <div className="agent-list">{agents.map((agent) => {
        const statusClass = agent.status === 'PARKED' ? 'is-parked' : agent.status === 'TRANSFERRED' ? 'is-transferred' : '';
        return <Link key={agent.id} href={`/agents/${agent.id}`} className="agent-card">
          <div>
            <p className="agent-code">{agent.id} · State version {agent.currentVersion}</p>
            <h3 className="agent-name">{agent.canonicalName}</h3>
            <p className="agent-role">{agent.role}</p>
            {agent.canonicalDomain && <span className="agent-domain"><span>Verified domain</span><span>{agent.canonicalDomain}</span></span>}
          </div>
          <span className={`status-pill ${statusClass}`}>{agent.status}</span>
        </Link>;
      })}</div> : <div className="empty-record">No Agents yet. Create Atlas to establish its first immutable state version.</div>}
    </section>

    <section className="editorial-section" style={{ marginTop: '64px', paddingBottom: 0 }}>
      <div className="editorial-heading">
        <p className="eyebrow">Canonical lifecycle</p>
        <div>
          <h2>One identity, seven states</h2>
          <p>The registry preserves each Agent as a continuous trajectory rather than a sequence of disconnected copies.</p>
        </div>
      </div>
      <Lifecycle />
    </section>
  </main>;
}
