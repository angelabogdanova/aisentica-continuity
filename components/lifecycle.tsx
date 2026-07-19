import type { Event } from '@/lib/types';

const steps = ['Create', 'Bind Domain', 'Develop', 'Park', 'Reactivate', 'Transfer', 'Continue'];

export function lifecycleCompletion(events: Event[]) {
  return {
    create: events.some((event) => event.eventType === 'CREATE'),
    bindDomain: events.some((event) => event.eventType === 'BIND_DOMAIN'),
    develop: events.some((event) => event.eventType === 'DEVELOP'),
    park: events.some((event) => event.eventType === 'PARK'),
    reactivate: events.some((event) => event.eventType === 'REACTIVATE'),
    transfer: events.some((event) => event.eventType === 'TRANSFER'),
    continue: events.some((event) => event.eventType === 'CONTINUE'),
  };
}

export function Lifecycle({ events = [] }: { events?: Event[] }) {
  const state = lifecycleCompletion(events);
  const completed = [state.create, state.bindDomain, state.develop, state.park, state.reactivate, state.transfer, state.continue];
  const nextIndex = completed.lastIndexOf(true) + 1;

  return <ol className="lifecycle-grid">{steps.map((step, index) => {
    const done = completed[index];
    const next = index === nextIndex && nextIndex < steps.length;
    const label = done ? 'Completed' : next ? 'Available' : 'Later phase';
    const stateClass = done ? 'is-complete' : next ? 'is-current' : '';

    return <li key={step} className={`lifecycle-step ${stateClass}`}>
      <span className="lifecycle-number">{String(index + 1).padStart(2, '0')}</span>
      <strong className="lifecycle-name">{step}</strong>
      <span className="lifecycle-label">{label}</span>
    </li>;
  })}</ol>;
}
