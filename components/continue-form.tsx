'use client';

import { useActionState } from 'react';
import { continueAgent, type ContinueState } from '@/app/actions';

const exampleObjective = 'Continue Atlas under Owner B by applying the inherited source-verification protocol to a new research task without resetting identity, domain, methods, or prior history.';

export function ContinueForm({ agentId, name }: { agentId: string; name: string }) {
  const [state, action, pending] = useActionState<ContinueState, FormData>(continueAgent, {});

  const fill = () => {
    const field = document.querySelector('[name="objective"]') as HTMLTextAreaElement | null;
    if (field) field.value = exampleObjective;
  };

  return <form action={action} className="card mt-5 space-y-5">
    <input type="hidden" name="agentId" value={agentId}/>
    <div>
      <p className="eyebrow">Stage 07 · Continue</p>
      <h2 className="mt-2 text-xl font-bold">Continue {name}</h2>
      <p className="mt-2 text-sm text-zinc-400">The successor owner resumes the same Agent from the transferred checkpoint. No copy and no reset are created.</p>
    </div>
    <button type="button" className="btn-muted text-sm" onClick={fill}>Use continuation example</button>
    {state.error&&<p role="alert" className="border border-red-700 bg-red-950/40 p-3 text-red-200">{state.error}</p>}
    <div><label className="label" htmlFor="objective">Continuation objective</label><textarea className="input min-h-28" id="objective" name="objective" required minLength={20} maxLength={1000}/></div>
    <button className="btn w-full" disabled={pending}>{pending?'Continuing agent…':'Continue Agent'}</button>
  </form>;
}
