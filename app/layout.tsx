import './globals.css';
import './record-controls.css';
import Link from 'next/link';

export const metadata = {
  title: 'Aisentica Continuity',
  description: 'Domain-Anchored Continuity for Transferable AI Agents',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>
    <header className="site-header">
      <nav className="site-shell site-nav" aria-label="Primary navigation">
        <Link href="/" className="site-brand" aria-label="Aisentica Continuity home">
          <span>Aisentica</span>
          <span className="site-brand-mark">Continuity</span>
        </Link>
        <Link href="/demo" className="site-nav-link">Demo access</Link>
      </nav>
    </header>
    {children}
    <footer className="site-shell site-footer">
      <span>Aisentica Continuity</span>
      <span>OpenAI Build Week · Live MVP</span>
    </footer>
  </>;
}
