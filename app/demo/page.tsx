import { selectOwner, resetDemo } from '@/app/actions';
import { currentOwner } from '@/lib/auth';
import { storageBackend } from '@/lib/config';

export default async function Demo({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const owner = await currentOwner();
  const { returnTo = '/dashboard' } = await searchParams;
  const showReset = Boolean(owner) && storageBackend() === 'memory';

  return <main className="mx-auto max-w-3xl px-5 py-16">
    <p className="eyebrow">Demonstration authorization</p>
    <h1 className="mt-3 text-4xl font-bold">Select a demo identity</h1>
    <p className="mt-4 text-zinc-400">This uses a signed HTTP-only cookie for the hackathon demonstration. Replace it with real authentication before production.</p>
    <div className="mt-8 grid gap-4 sm:grid-cols-2">{[['owner-a','Owner A'],['owner-b','Owner B']].map(([id,label])=><form key={id} action={selectOwner} className="card">
      <input type="hidden" name="ownerId" value={id}/>
      <input type="hidden" name="returnTo" value={returnTo}/>
      <h2 className="text-xl font-bold">{label}</h2>
      <p className="my-3 text-sm text-zinc-400">A separate, server-validated demo identity.</p>
      <button className="btn w-full">Continue as {label}</button>
    </form>)}</div>
    {showReset&&<form action={resetDemo} className="card mt-8">
      <h2 className="font-bold">Reset local demo data</h2>
      <p className="my-2 text-sm text-zinc-400">Available only with temporary in-memory storage. Production reset is disabled.</p>
      <button className="btn-muted">I confirm: reset local demo</button>
    </form>}
  </main>;
}
