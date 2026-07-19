'use client';

import { useActionState } from 'react';
import { initiateAgentTransfer, type TransferState } from '@/app/actions';

const exampleSummary = 'Transfer Atlas with its verified domain, immutable versions, developed historical-claim verification protocol, parked checkpoint, and reactivation history intact.';

export function TransferForm({ agentId, name, currentOwnerId }: { agentId: string; name: string; currentOwnerId: string }) {
  const [state, action, pending] = useActionState<TransferState, FormData>(initiateAgentTransfer, {});
  const intendedOwnerId = currentOwnerId === 'owner-a' ? 'owner-b' : 'owner-a';
  const intendedOwnerName = intendedOwnerId === 'owner-a' ? 'Owner A' : 'Owner B';

  const fill = () => {
    const field = document.querySelector('[name="handoffSummary"]') as HTMLTextAreaElement | null;
    if (field) field.value = exampleSummary;
  };

  return <form action={action} className="card mt-5 space-y-5">
    <input type="hidden" name="agentId" value={agentId}/>
    <input type="hidden" name="intendedOwnerId" value={intendedOwnerId}/>
    <div>
      <p className="eyebrow">Stage 06 · Transfer</p>
      <h2 className="mt-2 text-xl font-bold">Transfer {name} to {intendedOwnerName}</h2>
      <p className="mt-2 text-sm text-zinc-400">Creates a single-use 15-minute acceptance link. Ownership changes only when the intended owner accepts it.</p>
    </div>
    <button type="button" className="btn-muted text-sm" onClick={fill}>Use transfer example</button>
    {state.error&&<p role="alert" className="border border-red-700 bg-red-950/40 p-3 text-red-200">{state.error}</p>}
    <div><label className="label" htmlFor="handoffSummary">Private handoff summary</label><textarea className="input min-h-28" id="handoffSummary" name="handoffSummary" required minLength={20} maxLength={1000}/></div>
    <button className="btn w-full" disabled={pending}>{pending?'Creating transfer offer…':`Create transfer offer for ${intendedOwnerName}`}</button>
  </form>;
}
