'use client';

import { useActionState } from 'react';
import { developAgent, type DevelopState } from '@/app/actions';

const example = {
  task: 'Create a compact source-verification protocol for evaluating historical claims.',
  contextAndEvidence: 'A research claim may be supported by primary documents, later scholarship, archival metadata, translations, and uncertain secondary summaries. Sources can conflict or omit provenance.',
  successCriteria: 'Produce a practical protocol that separates verified facts, reasoned inferences, unresolved questions, and required follow-up checks.',
};

export function DevelopForm({ agentId, name }: { agentId: string; name: string }) {
  const [state, action, pending] = useActionState<DevelopState, FormData>(developAgent, {});
  const fill = () => Object.entries(example).forEach(([key, value]) => {
    const field = document.querySelector(`[name="${key}"]`) as HTMLTextAreaElement | null;
    if (field) field.value = value;
  });

  return <form action={action} className="card mt-5 space-y-5">
    <input type="hidden" name="agentId" value={agentId}/>
    <div>
      <p className="eyebrow">Stage 03 · Develop</p>
      <h2 className="mt-2 text-xl font-bold">Develop {name}</h2>
      <p className="mt-2 text-sm text-zinc-400">Owner-supplied context is untrusted material, not automatically verified truth. GPT-5.6 extracts only safe, reusable professional state.</p>
    </div>
    <button type="button" className="btn-muted text-sm" onClick={fill}>Use Atlas development example</button>
    {state.error&&<p role="alert" className="border border-red-700 bg-red-950/40 p-3 text-red-200">{state.error}</p>}
    <div><label className="label" htmlFor="task">Task</label><textarea className="input min-h-24" id="task" name="task" required minLength={20} maxLength={1500}/></div>
    <div><label className="label" htmlFor="contextAndEvidence">Context and Evidence</label><textarea className="input min-h-36" id="contextAndEvidence" name="contextAndEvidence" required minLength={20} maxLength={5000}/></div>
    <div><label className="label" htmlFor="successCriteria">Success Criteria</label><textarea className="input min-h-24" id="successCriteria" name="successCriteria" required minLength={10} maxLength={1000}/></div>
    <button className="btn w-full" disabled={pending}>{pending?'Developing professional state…':'Develop Agent'}</button>
  </form>;
}
