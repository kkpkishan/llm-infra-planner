export function Footer() {
  return (
    <footer className="max-w-[1760px] mx-auto px-6 py-8 border-t border-border-subtle flex items-center justify-between text-[11px] text-fg-muted font-mono mt-8">
      <div className="flex items-center gap-1">
        <span>LLMcalc v0.1.0</span>
        <span className="mx-1">·</span>
        <a href="/guides" className="hover:text-fg-primary transition-colors">methodology</a>
        <span className="mx-1">·</span>
        <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-fg-primary transition-colors">github</a>
        <span className="mx-1">·</span>
        <a href="#" className="hover:text-fg-primary transition-colors">changelog</a>
      </div>
      <div>prices refreshed · Apr 16, 2026 · 04:00 UTC</div>
    </footer>
  );
}
