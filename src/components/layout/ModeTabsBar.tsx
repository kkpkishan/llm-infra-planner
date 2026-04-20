import * as React from 'react';
import { Zap, Wrench, Repeat, Share2, ArrowLeftRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCalculatorStore } from '@/store/calculator-store';
import { useNavigate, useLocation } from 'react-router-dom';
import type { WorkloadMode } from '@/lib/formulas/types';

// Calculator modes — Reverse is a separate page, not a mode
const CALC_TABS: { mode: WorkloadMode; label: string; icon: React.ReactNode; key: string }[] = [
  { mode: 'inference', label: 'Inference', icon: <Zap size={14} />, key: 'i' },
  { mode: 'train',     label: 'Train',     icon: <Wrench size={14} />, key: 't' },
];

interface ModeTabsBarProps {
  onShare?: () => void;
  onCompare?: () => void;
}

export function ModeTabsBar({ onShare, onCompare }: ModeTabsBarProps) {
  const { mode, setMode } = useCalculatorStore();
  const navigate = useNavigate();
  const location = useLocation();
  const isReversePage = location.pathname === '/reverse';

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (isReversePage) return;
    const tabs = CALC_TABS.map(t => t.mode);
    const currentIndex = tabs.indexOf(mode);
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      setMode(tabs[(currentIndex + 1) % tabs.length]);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setMode(tabs[(currentIndex - 1 + tabs.length) % tabs.length]);
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
        {/* Calculator mode tabs — only shown on calculator page */}
        {!isReversePage && CALC_TABS.map(tab => {
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

        {/* Reverse — always a nav link, active when on /reverse */}
        <button
          onClick={() => isReversePage ? navigate('/') : navigate('/reverse')}
          className={cn(
            'h-12 px-3.5 flex items-center gap-1.5 text-sm font-medium relative',
            'border-b-2 -mb-px transition-colors duration-fast',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
            isReversePage
              ? 'text-fg-primary border-accent'
              : 'text-fg-muted border-transparent hover:text-fg-default hover:border-border-subtle'
          )}
          title="Reverse: find models that fit your GPU (r)"
        >
          <Repeat size={14} />
          Reverse
        </button>
      </div>

      {/* Right actions */}
      <div className="ml-auto flex items-center gap-2">
        {!isReversePage && (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}
