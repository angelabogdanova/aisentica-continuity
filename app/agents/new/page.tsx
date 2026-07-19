import { requireOwner } from '@/lib/auth';
import { CreateForm } from '@/components/create-form';

export default async function NewAgent() {
  const owner = await requireOwner();
  return <main className="site-shell page-frame">
    <header className="page-intro">
      <div>
        <p className="eyebrow">Create / {owner.displayName}</p>
        <h1 className="page-title">Establish Identity</h1>
      </div>
      <p className="page-note">The Agent Manifest becomes State Version 1 and begins a permanent, attributable lifecycle trail.</p>
    </header>
    <div style={{ maxWidth: '900px' }}><CreateForm /></div>
  </main>;
}
