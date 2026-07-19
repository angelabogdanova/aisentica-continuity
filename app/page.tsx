import Link from 'next/link';
import { Lifecycle } from '@/components/lifecycle';

export default function Home() {
  return <main>
    <section className="site-shell hero">
      <div className="hero-space" aria-hidden="true" />
      <div className="hero-content">
        <p className="eyebrow">Developer tools / persistent agents</p>
        <h1 className="hero-title"><span>Aisentica</span><span>Continuity</span></h1>
        <p className="hero-deck">Domain-Anchored Continuity for Transferable AI Agents</p>
        <p className="hero-copy">Aisentica turns an AI agent into a domain-anchored, persistent, transferable digital asset. Create its identity and preserve a verifiable state trajectory.</p>
        <div className="hero-actions">
          <Link href="/demo" className="btn">Enter the demo</Link>
          <a href="#lifecycle" className="btn-muted">View lifecycle</a>
        </div>
        <p className="manifest-quote">An agent is not transferred as a copy. Its identity, state history, and trajectory continue.</p>
      </div>
    </section>

    <section id="lifecycle" className="site-shell editorial-section">
      <div className="editorial-heading">
        <p className="eyebrow">Canonical lifecycle</p>
        <div>
          <h2>Create to Continue</h2>
          <p>Seven state transitions preserve one public Agent identity across development, dormancy, transfer, and successor ownership.</p>
        </div>
      </div>
      <Lifecycle />
    </section>
  </main>;
}
