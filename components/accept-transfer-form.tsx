'use client';

import { useActionState } from 'react';
import { acceptAgentTransfer, type AcceptTransferState } from '@/app/actions';

export function AcceptTransferForm({ token, agentName }: { token: string; agentName: string }) {
  const [state, action, pending] = useActionState<AcceptTransferState, FormData>(acceptAgentTransfer, {});

  return <form action={action} className="mt-6 space-y-4">
    <input type="hidden" name="token" value={token}/>
    {state.error&&<p role="alert" className="border border-red-700 bg-red-950/40 p-3 text-red-200">{state.error}</p>}
    <button className="btn w-full" disabled={pending}>{pending?'Accepting transfer…':`Accept ${agentName}`}</button>
  </form>;
}
