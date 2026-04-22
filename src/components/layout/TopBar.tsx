import * as React from 'react';
import { Moon, Sun, Keyboard, Github, Menu, X } from 'lucide-react';
import { useTheme } from '@/lib/use-theme';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { label: 'Calculator', href: '/' },
  { label: 'Compare', href: '/compare' },
  { label: 'Reverse', href: '/reverse' },
  { label: 'Models', href: '/models' },
  { label: 'Hardware', href: '/hardware' },
  { label: 'Guides', href: '/guides' },
];

interface TopBarProps {
  currentPath?: string;
  onOpenShortcuts?: () => void;
}

export function TopBar({ currentPath = '/', onOpenShortcuts }: TopBarProps) {
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const builtAt = '2026-04-16T04:00:00Z';
  const hoursAgo = Math.floor((Date.now() - new Date(builtAt).getTime()) / 3_600_000);
  const freshnessLabel = hoursAgo < 1 ? 'just now' : `${hoursAgo}h ago`;

  return (
    <>
      <header
        className="h-12 border-b border-border-subtle bg-bg-base sticky top-0 z-[20] flex items-center px-4 md:px-6 gap-4 md:gap-8"
        role="banner"
      >
        {/* Skip link */}
        <a href="#main-content" className="skip-link">Skip to main content</a>

        {/* Logo */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="inline-grid grid-cols-3 gap-[2px]" aria-hidden="true">
            {Array.from({ length: 9 }).map((_, i) => (
              <span key={i} className={cn('w-[4px] h-[4px] rounded-[1px]', i === 4 ? 'bg-accent' : 'bg-fg-muted')} />
            ))}
          </span>
          <span className="font-mono font-semibold text-sm tracking-tight text-fg-primary">LLMcalc</span>
        </div>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-1 ml-4" aria-label="Main navigation">
          {NAV_LINKS.map(link => (
            <a key={link.href} href={link.href}
              className={cn('text-sm px-2.5 py-1.5 rounded-md transition-colors duration-fast',
                currentPath === link.href ? 'text-fg-primary bg-bg-muted' : 'text-fg-muted hover:text-fg-primary hover:bg-bg-muted')}
              aria-current={currentPath === link.href ? 'page' : undefined}>
              {link.label}
            </a>
          ))}
        </nav>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-1">
          <button onClick={toggleTheme}
            className="w-8 h-8 rounded-md flex items-center justify-center text-fg-muted hover:text-fg-primary hover:bg-bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode (⌘\\)`}>
            {theme === 'dark' ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
          </button>
          <button onClick={onOpenShortcuts}
            className="hidden sm:flex w-8 h-8 rounded-md items-center justify-center text-fg-muted hover:text-fg-primary hover:bg-bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Keyboard shortcuts (?)">
            <Keyboard size={16} aria-hidden="true" />
          </button>
          <a href="https://github.com/kkpkishan/llm-infra-planner.git" target="_blank" rel="noopener noreferrer"
            className="hidden sm:flex w-8 h-8 rounded-md items-center justify-center text-fg-muted hover:text-fg-primary hover:bg-bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="GitHub repository (opens in new tab)">
            <Github size={16} aria-hidden="true" />
          </a>
          {/* Hamburger — mobile only */}
          <button onClick={() => setMobileMenuOpen(o => !o)}
            className="lg:hidden w-8 h-8 rounded-md flex items-center justify-center text-fg-muted hover:text-fg-primary hover:bg-bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen} aria-controls="mobile-nav">
            {mobileMenuOpen ? <X size={16} aria-hidden="true" /> : <Menu size={16} aria-hidden="true" />}
          </button>
        </div>
      </header>

      {/* Mobile nav drawer */}
      {mobileMenuOpen && (
        <nav id="mobile-nav" className="lg:hidden fixed top-12 left-0 right-0 z-[19] bg-bg-base border-b border-border-subtle px-4 py-3 flex flex-col gap-1" aria-label="Mobile navigation">
          {NAV_LINKS.map(link => (
            <a key={link.href} href={link.href} onClick={() => setMobileMenuOpen(false)}
              className={cn('text-sm px-3 py-2.5 rounded-md transition-colors min-h-[44px] flex items-center',
                currentPath === link.href ? 'text-fg-primary bg-bg-muted font-medium' : 'text-fg-muted hover:text-fg-primary hover:bg-bg-muted')}
              aria-current={currentPath === link.href ? 'page' : undefined}>
              {link.label}
            </a>
          ))}
        </nav>
      )}
    </>
  );
}
