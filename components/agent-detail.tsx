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

function RecordList({ title, items }: { title: string; items?: string[] }) {
  if (!items?.length) return null;
  return <article className="record-block">
    <h3>{title}</h3>
    <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul>
  </article>;
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
  const statusClass = agent.status === 'PARKED' ? 'is-parked' : agent.status === 'TRANSFERRED' ? 'is-transferred' : '';
  const hasOperations = Boolean(currentDomain && !agent.canonicalDomain) || canContinue || canDevelop || canPark || canReactivate || canTransfer;

  return <main className="site-shell record-page">
    <header className="record-hero">
      <div>
        <p className="record-code">{agent.id} · State version {agent.currentVersion}</p>
        <h1 className="record-title">{agent.canonicalName}</h1>
        <p className="record-role">{agent.role}</p>
      </div>
      <div className="record-actions">
        <span className={`status-pill ${statusClass}`}>{agent.status}</span>
        {privateView && <Link className="btn-muted" href={`/public/agents/${agent.id}`}>View public card</Link>}
      </div>
    </header>

    <dl className="record-meta-strip">
      <div className="meta-cell"><dt className="meta-label">Status</dt><dd className="meta-value">{agent.status}</dd></div>
      <div className="meta-cell"><dt className="meta-label">Owner</dt><dd className="meta-value">{privateView ? owner.displayName : 'Not disclosed'}</dd></div>
      <div className="meta-cell"><dt className="meta-label">Created</dt><dd className="meta-value">{new Date(agent.createdAt).toLocaleDateString()}</dd></div>
      <div className="meta-cell"><dt className="meta-label">Canonical domain</dt><dd className="meta-value">{agent.canonicalDomain ? `Verified · ${agent.canonicalDomain}` : 'Not bound'}</dd></div>
    </dl>

    <section className="record-section">
      <div className="section-heading-row">
        <span className="section-kicker">I</span>
        <div>
          <h2 className="section-title">Public Identity</h2>
          <p className="section-intro">The public-facing identity remains distinguishable from private owner data while preserving the same Agent trajectory.</p>
        </div>
      </div>
      <div className="prose-record">
        <p>{version.stateJson.publicIdentitySummary}</p>
        <p>{agent.purpose}</p>
        {latest && <p>{latest.publicDevelopmentSummary}</p>}
        {continuation && <p>{continuation.continuitySummary}</p>}
      </div>
      <div className="badge-row">
        {latest && <span className="identity-badge">Developed professional state</span>}
        {agent.status === 'PARKED' && <span className="identity-badge">Parked · state preserved</span>}
        {agent.status === 'ACTIVE' && hasReactivation && <span className="identity-badge">Reactivated · continuity preserved</span>}
        {hasTransfer && <span className="identity-badge">Transferred · same Agent identity</span>}
        {hasContinue && <span className="identity-badge">Continued under successor ownership</span>}
      </div>
    </section>

    {privateView && <>
      <section className="record-section">
        <div className="section-heading-row">
          <span className="section-kicker">II</span>
          <div>
            <h2 className="section-title">Agent Manifest</h2>
            <p className="section-intro">The identity-bearing record established at creation and carried through every later state version.</p>
          </div>
        </div>
        <div className="record-columns">
          <article className="record-block"><h3>Field</h3><p>{version.stateJson.field}</p></article>
          <article className="record-block"><h3>Purpose</h3><p>{version.stateJson.purpose}</p></article>
          <RecordList title="Capabilities" items={version.stateJson.capabilities} />
          <RecordList title="Operating principles" items={version.stateJson.operatingPrinciples} />
          <RecordList title="Memory schema" items={version.stateJson.memorySchema} />
          <RecordList title="Transferable state rules" items={version.stateJson.transferableStateRules} />
          <RecordList title="Private owner data rules" items={version.stateJson.privateOwnerDataRules} />
        </div>
      </section>

      <section className="record-section">
        <div className="section-heading-row">
          <span className="section-kicker">III</span>
          <div>
            <h2 className="section-title">Development Record</h2>
            <p className="section-intro">Validated work becomes durable professional state that remains reviewable after parking, transfer, and continuation.</p>
          </div>
        </div>
        {latest ? <>
          <div className="record-columns">
            <article className="record-block"><h3>Task summary</h3><p>{latest.taskSummary}</p></article>
            <article className="record-block"><h3>Work result</h3><p>{latest.workResult}</p></article>
            <RecordList title="Validated knowledge" items={latest.validatedKnowledge} />
            <RecordList title="Reusable methods" items={latest.reusableMethods} />
            <RecordList title="Evidence assessment" items={latest.evidenceAssessment} />
            <RecordList title="Corrections" items={latest.corrections} />
            <RecordList title="Open questions" items={latest.openQuestions} />
            <RecordList title="Limitations" items={latest.limitations} />
          </div>
          <p className="manifest-quote">{latest.confidenceStatement}</p>
        </> : <div className="empty-record">No development record has been established yet.</div>}
      </section>

      <section className="record-section">
        <div className="section-heading-row">
          <span className="section-kicker">IV</span>
          <div>
            <h2 className="section-title">State Timeline</h2>
            <p className="section-intro">Every lifecycle action produces an attributable event attached to the same Agent identifier.</p>
          </div>
        </div>
        <ol className="timeline-list">{events.map((event) => <li key={event.id} className="timeline-item">
          <span className="timeline-dot" aria-hidden="true" />
          <strong className="timeline-type">v{event.metadataJson.version} · {event.eventType}</strong>
          <span className="timeline-summary">{eventSummary(event)}</span>
          <time className="timeline-time">{new Date(event.createdAt).toLocaleString()}</time>
        </li>)}</ol>
      </section>

      <section className="record-section">
        <div className="section-heading-row">
          <span className="section-kicker">V</span>
          <div>
            <h2 className="section-title">Version History</h2>
            <p className="section-intro">Seven immutable versions document one continuous identity rather than seven replacement copies.</p>
          </div>
        </div>
        <div className="version-list">{versions.map((item) => <details key={item.id} className="version-record" open={item.versionNumber === agent.currentVersion}>
          <summary>
            <span className="version-number">Version {String(item.versionNumber).padStart(2, '0')}</span>
            <span className="version-type">{item.versionType}{item.versionNumber === agent.currentVersion && <span className="version-current">Current state</span>}</span>
          </summary>
          <div className="version-body">
            <p>{item.changeSummary}</p>
            <p className="mono">{new Date(item.createdAt).toLocaleString()}</p>
            <details className="technical-disclosure">
              <summary>Version state JSON</summary>
              <pre>{JSON.stringify(item.stateJson, null, 2)}</pre>
            </details>
          </div>
        </details>)}</div>
      </section>

      <section className="record-section">
        <div className="section-heading-row">
          <span className="section-kicker">VI</span>
          <div>
            <h2 className="section-title">Canonical Lifecycle</h2>
            <p className="section-intro">Create → Bind Domain → Develop → Park → Reactivate → Transfer → Continue.</p>
          </div>
        </div>
        <Lifecycle events={events} />
      </section>

      <section className="record-section">
        <div className="section-heading-row">
          <span className="section-kicker">VII</span>
          <div>
            <h2 className="section-title">Technical Record</h2>
            <p className="section-intro">The complete current state remains available for machine inspection without overwhelming the documentary view.</p>
          </div>
        </div>
        <details className="technical-disclosure">
          <summary>Current structured Agent state</summary>
          <pre>{JSON.stringify(version.stateJson, null, 2)}</pre>
        </details>
      </section>

      {hasOperations && <section className="record-section">
        <div className="section-heading-row">
          <span className="section-kicker">VIII</span>
          <div>
            <h2 className="section-title">Operational Controls</h2>
            <p className="section-intro">Private lifecycle actions remain available to the authenticated owner.</p>
          </div>
        </div>
        <details className="operations-disclosure">
          <summary>Open owner controls</summary>
          <div className="operation-stack">
            {currentDomain && !agent.canonicalDomain && <BindDomainForm agentId={agent.id} domain={currentDomain} />}
            {canContinue && <ContinueForm agentId={agent.id} name={agent.canonicalName} />}
            {canDevelop && <DevelopForm agentId={agent.id} name={agent.canonicalName} />}
            {canPark && <ParkForm agentId={agent.id} name={agent.canonicalName} />}
            {canReactivate && <ReactivateForm agentId={agent.id} name={agent.canonicalName} />}
            {canTransfer && <TransferForm agentId={agent.id} name={agent.canonicalName} currentOwnerId={owner.id} />}
          </div>
        </details>
      </section>}
    </>}
  </main>;
}
