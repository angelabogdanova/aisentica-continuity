'use client';

import { useActionState } from 'react';
import { parkAgent, type ParkState } from '@/app/actions';

const exampleReason = 'Pause this agent after the completed development cycle while preserving its verified domain, immutable history, and transferable professional state.';

export function ParkForm({ agentId, name }: { agentId: string; name: string }) {
  const [state, action, pending] = useActionState<ParkState, FormData>(parkAgent, {});

  const fill = () => {
    const field = document.querySelector('[name="reason"]') as HTMLTextAreaElement | null;
    if (field) field.value = exampleReason;
  };

  return <form action={action} className="card mt-5 space-y-5">
    <input type="hidden" name="agentId" value={agentId}/>
    <div>
      <p className="eyebrow">Stage 04 · Park</p>
      <h2 className="mt-2 text-xl font-bold">Park {name}</h2>
      <p className="mt-2 text-sm text-zinc-400">Parking changes availability without deleting identity, domain binding, development history, or prior versions.</p>
    </div>
    <button type="button" className="btn-muted text-sm" onClick={fill}>Use parking example</button>
    {state.error&&<p role="alert" className="border border-red-700 bg-red-950/40 p-3 text-red-200">{state.error}</p>}
    <div><label className="label" htmlFor="reason">Parking reason</label><textarea className="input min-h-24" id="reason" name="reason" required minLength={10} maxLength={500}/></div>
    <button className="btn w-full" disabled={pending}>{pending?'Parking agent…':'Park Agent'}</button>
  </form>;
}
