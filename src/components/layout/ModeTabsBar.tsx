import { Zap, BarChart2, Wrench, Repeat, Share2, ArrowLeftRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCalculatorStore } from '@/store/calculator-store';
import type { WorkloadMode } from '@/lib/formulas/types';

const TABS: { mode: WorkloadMode; label: string; icon: React.ReactNode; key: string }[] = [
  { mode: 'inference', label: 'Inference', icon: <Zap size={14} />, key: 'i' },
  { mode: 'scale',     label: 'Scale',     icon: <BarChart2 size={14} />, key: 's' },
  { mode: 'train',     label: 'Train',     icon: <Wrench size={14} />, key: 't' },
  { mode: 'reverse',   label: 'Reverse',   icon: <Repeat size={14} />, key: 'r' },
];

interface ModeTabsBarProps {
  onShare?: () => void;
  onCompare?: () => void;
}

export function ModeTabsBar({ onShare, onCompare }: ModeTabsBarProps) {
  const { mode, setMode } = useCalculatorStore();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const tabs = TABS.map(t => t.mode);
    const currentIndex = tabs.indexOf(mode);
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      setMode(tabs[(currentIndex + 1) % tabs.length]);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setMode(tabs[(currentIndex - 1 + tabs.length) % tabs.length]);
    } else if (e.key === 'Home') {
      e.preventDefault();
      setMode(tabs[0]);
    } else if (e.key === 'End') {
      e.preventDefault();
      setMode(tabs[tabs.length - 1]);
    }
  };

  return (
    <div
      className="h-12 border-b border-border-subtle bg-bg-base sticky top-12 z-[19] flex items-center px-6 gap-1"
      role="navigation"
      aria-label="Calculator modes"
    >
      {/* Mode tabs */}
      <div
        role="tablist"
        aria-label="Workload mode"
        className="flex items-center gap-1"
        onKeyDown={handleKeyDown}
      >
        {TABS.map(tab => {
          const isActive = mode === tab.mode;
          return (
            <button
              key={tab.mode}
              role="tab"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setMode(tab.mode)}
              className={cn(
                'h-12 px-3.5 flex items-center gap-1.5 text-sm font-medium relative',
                'border-b-2 -mb-px transition-colors duration-fast',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                isActive
                  ? 'text-fg-primary border-accent'
                  : 'text-fg-muted border-transparent hover:text-fg-default hover:border-border-subtle'
              )}
              title={`${tab.label} (${tab.key})`}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Right actions */}
      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={onShare}
          className="h-8 px-3 rounded-md text-sm font-medium flex items-center gap-1.5 bg-bg-muted border border-border-subtle text-fg-primary hover:bg-bg-emphasis transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Share current configuration (⌘Enter)"
          title="Share (⌘Enter)"
        >
          <Share2 size={14} />
          Share
        </button>
        <button
          onClick={onCompare}
          className="h-8 px-3 rounded-md text-sm font-medium flex items-center gap-1.5 bg-bg-muted border border-border-subtle text-fg-primary hover:bg-bg-emphasis transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Compare configurations (c)"
          title="Compare (c)"
        >
          <ArrowLeftRight size={14} />
          Compare
        </button>
      </div>
    </div>
  );
}
