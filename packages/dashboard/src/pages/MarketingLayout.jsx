import { Link } from 'react-router-dom';

export function MarketingLayout({ children, title, label, sub }) {
  return (
    <div className="min-h-screen bg-mcode-bg bg-grid-dots bg-size-dots">
      <nav className="border-b border-mcode-border bg-mcode-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link to="/" className="font-mono font-bold text-white">mcode</Link>
          <div className="flex gap-6 text-sm text-gray-400">
            <Link to="/" className="hover:text-mcode-green">Home</Link>
            <Link to="/commands" className="hover:text-mcode-green">Commands</Link>
            <Link to="/plugins" className="hover:text-mcode-green">Plugins</Link>
            <Link to="/changelog" className="hover:text-mcode-green">Changelog</Link>
            <Link to="/app" className="text-mcode-green">Dashboard</Link>
          </div>
        </div>
      </nav>
      <header className="border-b border-mcode-border bg-mcode-panel/30 py-14">
        <div className="mx-auto max-w-6xl px-6">
          <p className="section-label">{label}</p>
          <h1 className="text-3xl font-bold text-white md:text-5xl">{title}</h1>
          {sub && <p className="mt-3 max-w-2xl text-gray-400">{sub}</p>}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-12">{children}</main>
    </div>
  );
}
