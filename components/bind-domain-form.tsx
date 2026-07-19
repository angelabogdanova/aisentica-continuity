'use client';

import { useActionState } from 'react';
import { bindDomain, type BindDomainState } from '@/app/actions';

export function BindDomainForm({ agentId, domain }: { agentId: string; domain: string }) {
  const [state, action, pending] = useActionState<BindDomainState, FormData>(bindDomain, {});
  return <form action={action} className="card mt-5"><input type="hidden" name="agentId" value={agentId}/><p className="eyebrow">Stage 02 · Bind Domain</p><h2 className="mt-2 text-xl font-bold">Bind current domain</h2><p className="mt-2 text-zinc-400">A same-origin HTTPS challenge will verify <strong className="text-white">{domain}</strong>. Arbitrary domains are disabled in this phase.</p>{state.error&&<p role="alert" className="mt-4 border border-red-700 bg-red-950/40 p-3 text-red-200">{state.error}</p>}<button disabled={pending} className="btn mt-5">{pending?'Verifying domain…':'Bind current domain'}</button></form>;
}
