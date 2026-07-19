'use client';

import { useActionState } from 'react';
import { reactivateAgent, type ReactivateState } from '@/app/actions';

const exampleReason = 'Resume Atlas after the parked checkpoint while preserving its identity, verified domain, immutable history, and developed professional state.';

export function ReactivateForm({ agentId, name }: { agentId: string; name: string }) {
  const [state, action, pending] = useActionState<ReactivateState, FormData>(reactivateAgent, {});

  const fill = () => {
    const field = document.querySelector('[name="reactivationReason"]') as HTMLTextAreaElement | null;
    if (field) field.value = exampleReason;
  };

  return <form action={action} className="card mt-5 space-y-5">
    <input type="hidden" name="agentId" value={agentId}/>
    <div>
      <p className="eyebrow">Stage 05 · Reactivate</p>
      <h2 className="mt-2 text-xl font-bold">Reactivate {name}</h2>
      <p className="mt-2 text-sm text-zinc-400">Reactivation restores availability while preserving the complete parked checkpoint and every prior version.</p>
    </div>
    <button type="button" className="btn-muted text-sm" onClick={fill}>Use reactivation example</button>
    {state.error&&<p role="alert" className="border border-red-700 bg-red-950/40 p-3 text-red-200">{state.error}</p>}
    <div><label className="label" htmlFor="reactivationReason">Reactivation reason</label><textarea className="input min-h-24" id="reactivationReason" name="reactivationReason" required minLength={10} maxLength={500}/></div>
    <button className="btn w-full" disabled={pending}>{pending?'Reactivating agent…':'Reactivate Agent'}</button>
  </form>;
}
