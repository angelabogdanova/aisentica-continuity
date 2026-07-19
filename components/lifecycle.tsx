import type { Event } from '@/lib/types';

const steps = ['Create', 'Bind Domain', 'Develop', 'Park', 'Transfer', 'Continue'];

export function lifecycleCompletion(events: Event[]) {
  return {
    create: events.some((event) => event.eventType === 'CREATE'),
    bindDomain: events.some((event) => event.eventType === 'BIND_DOMAIN'),
    develop: events.some((event) => event.eventType === 'DEVELOP'),
  };
}

export function Lifecycle({ events = [] }: { events?: Event[] }) {
  const state = lifecycleCompletion(events);
  const completed = [state.create, state.bindDomain, state.develop, false, false, false];
  const nextIndex = completed.lastIndexOf(true) + 1;

  return <ol className="grid grid-cols-2 gap-2 sm:grid-cols-6">{steps.map((step, index) => {
    const done = completed[index];
    const next = index === nextIndex;
    return <li key={step} className={`border p-3 text-sm ${done?'border-red-500 bg-red-500/10 text-white':next?'border-blue-600 text-zinc-200':'border-zinc-800 text-zinc-500'}`}><b className="block">{String(index+1).padStart(2,'0')} {step}</b><span className="text-xs">{done?'Completed':next&&index<=2?'Available':next?'Next phase':'Later phase'}</span></li>;
  })}</ol>;
}
