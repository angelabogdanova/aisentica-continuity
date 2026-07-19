import { selectOwner, resetDemo } from '@/app/actions';
import { currentOwner } from '@/lib/auth';
import { storageBackend } from '@/lib/config';

export default async function Demo({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const owner = await currentOwner();
  const { returnTo = '/dashboard' } = await searchParams;
  const showReset = Boolean(owner) && storageBackend() === 'memory';
  const owners = [
    { id: 'owner-a', label: 'Owner A', code: 'Identity 01' },
    { id: 'owner-b', label: 'Owner B', code: 'Identity 02' },
  ];

  return <main className="site-shell page-frame">
    <header className="page-intro">
      <div>
        <p className="eyebrow">Demonstration authorization</p>
        <h1 className="page-title">Demo Access</h1>
      </div>
      <p className="page-note">Select a server-validated demonstration identity. A signed HTTP-only cookie keeps each owner session separate for the Build Week demonstration.</p>
    </header>

    <section className="card-grid" aria-label="Demo identities">
      {owners.map(({ id, label, code }) => <form key={id} action={selectOwner} className="paper-card">
        <input type="hidden" name="ownerId" value={id} />
        <input type="hidden" name="returnTo" value={returnTo} />
        <p className="eyebrow">{code}</p>
        <h2 className="card-title">{label}</h2>
        <p className="card-copy">A separate, server-validated owner identity with its own private view of registered Agents.</p>
        <button className="btn">Continue as {label}</button>
      </form>)}
    </section>

    {showReset && <form action={resetDemo} className="paper-card" style={{ marginTop: '18px' }}>
      <p className="eyebrow">Local environment</p>
      <h2 className="card-title" style={{ fontSize: '2rem', marginTop: '10px' }}>Reset demo data</h2>
      <p className="card-copy">Available only with temporary in-memory storage. Production reset remains disabled.</p>
      <button className="btn-muted">I confirm: reset local demo</button>
    </form>}
  </main>;
}
