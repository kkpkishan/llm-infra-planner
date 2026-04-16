import { TopBar } from './TopBar';
import { ModeTabsBar } from './ModeTabsBar';
import { Footer } from './Footer';

interface PageShellProps {
  children: React.ReactNode;
  currentPath?: string;
  onShare?: () => void;
  onCompare?: () => void;
  showModeTabs?: boolean;
  onOpenShortcuts?: () => void;
}

export function PageShell({
  children,
  currentPath = '/',
  onShare,
  onCompare,
  showModeTabs = true,
  onOpenShortcuts,
}: PageShellProps) {
  return (
    <div className="min-h-screen bg-bg-base text-fg-default flex flex-col">
      <TopBar currentPath={currentPath} onOpenShortcuts={onOpenShortcuts} />
      {showModeTabs && <ModeTabsBar onShare={onShare} onCompare={onCompare} />}
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
