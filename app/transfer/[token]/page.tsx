import Link from 'next/link';
import { notFound } from 'next/navigation';
import { currentOwner } from '@/lib/auth';
import { repository } from '@/lib/repository';
import { hashTransferToken, validateTransferToken } from '@/lib/transfer-token';
import { AcceptTransferForm } from '@/components/accept-transfer-form';

export default async function TransferPage({ params }: { params: Promise<{ token: string }> }) {
  const { token: rawToken } = await params;
  let token: string;
  try { token = validateTransferToken(rawToken); } catch { notFound(); }

  const offer = await repository.transferOffer(hashTransferToken(token));
  if (!offer) notFound();

  const detail = await repository.detail(offer.agentId);
  const fromOwner = await repository.owner(offer.fromOwnerId);
  const intendedOwner = await repository.owner(offer.intendedOwnerId);
  const owner = await currentOwner();
  if (!detail || !fromOwner || !intendedOwner) notFound();

  const expired = new Date(offer.expiresAt).getTime() <= Date.now();
  const returnTo = `/transfer/${token}`;

  return <main className="mx-auto max-w-3xl px-5 py-16">
    <p className="eyebrow">Stage 06 · Transfer acceptance</p>
    <h1 className="mt-3 text-4xl font-bold">{detail.agent.canonicalName}</h1>
    <p className="mt-2 text-zinc-400">{detail.agent.id} · State Version {offer.fromVersion}</p>

    <section className="card mt-8">
      <dl className="grid gap-4 sm:grid-cols-2">
        <div><dt className="text-xs text-zinc-500">From</dt><dd>{fromOwner.displayName}</dd></div>
        <div><dt className="text-xs text-zinc-500">Intended owner</dt><dd>{intendedOwner.displayName}</dd></div>
        <div><dt className="text-xs text-zinc-500">Verified domain</dt><dd>{detail.agent.canonicalDomain}</dd></div>
        <div><dt className="text-xs text-zinc-500">Expires</dt><dd>{new Date(offer.expiresAt).toLocaleString()}</dd></div>
      </dl>
      <div className="mt-5 border-t border-zinc-800 pt-5"><p className="text-xs text-zinc-500">Private handoff summary</p><p className="mt-2 text-zinc-300">{offer.handoffSummary}</p></div>

      {offer.acceptedAt
        ? <div className="mt-6 border border-emerald-700 p-4 text-emerald-200">Transfer already accepted. The intended owner can open the same Agent from the dashboard.</div>
        : expired
          ? <div className="mt-6 border border-red-700 p-4 text-red-200">This single-use transfer offer has expired.</div>
          : owner?.id === offer.intendedOwnerId
            ? <AcceptTransferForm token={token} agentName={detail.agent.canonicalName}/>
            : <div className="mt-6"><p className="text-sm text-zinc-400">Sign in as {intendedOwner.displayName} to accept this single-use offer.</p><Link className="btn mt-4 inline-block" href={`/demo?returnTo=${encodeURIComponent(returnTo)}`}>Select {intendedOwner.displayName}</Link></div>}
    </section>
  </main>;
}
