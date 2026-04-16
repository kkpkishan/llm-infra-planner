import { X } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/primitives/dialog';
import { SHORTCUT_DEFS } from '@/lib/keyboard-shortcuts';

interface ShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

// Group shortcuts by category
const grouped = SHORTCUT_DEFS.reduce<Record<string, typeof SHORTCUT_DEFS>>((acc, s) => {
  if (!acc[s.category]) acc[s.category] = [];
  acc[s.category].push(s);
  return acc;
}, {});

export function ShortcutsModal({ open, onClose }: ShortcutsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md" aria-label="Keyboard shortcuts">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-fg-primary">Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            className="text-fg-muted hover:text-fg-default transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
            aria-label="Close shortcuts modal"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-5">
          {Object.entries(grouped).map(([category, shortcuts]) => (
            <div key={category}>
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-fg-muted mb-2">
                {category}
              </h3>
              <div className="flex flex-col gap-1">
                {shortcuts.map(s => (
                  <div key={s.keys} className="flex items-center justify-between py-1">
                    <span className="text-xs text-fg-default">{s.description}</span>
                    <kbd className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded border border-border-default bg-bg-muted font-mono text-[11px] text-fg-muted">
                      {s.keys}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
