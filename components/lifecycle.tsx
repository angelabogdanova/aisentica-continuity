const steps = ['Create', 'Bind Domain', 'Develop', 'Park', 'Transfer', 'Continue'];

export function Lifecycle({ currentVersion = 1 }: { currentVersion?: number }) {
  const completed = currentVersion >= 2 ? 2 : 1;
  return <ol className="grid grid-cols-2 gap-2 sm:grid-cols-6">{steps.map((step, index) => { const done = index < completed; const next = index === completed; return <li key={step} className={`border p-3 text-sm ${done?'border-red-500 bg-red-500/10 text-white':next?'border-blue-600 text-zinc-200':'border-zinc-800 text-zinc-500'}`}><b className="block">{String(index+1).padStart(2,'0')} {step}</b><span className="text-xs">{done?'Completed':next&&index===1?'Available':next?'Next phase':'Later phase'}</span></li>; })}</ol>;
}
