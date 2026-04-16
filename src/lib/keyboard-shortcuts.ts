import type { WorkloadMode } from '@/lib/formulas/types';

export interface ShortcutDef {
  keys: string;          // display string e.g. "⌘K"
  description: string;
  category: string;
}

export const SHORTCUT_DEFS: ShortcutDef[] = [
  { keys: '⌘K',      description: 'Open model search',       category: 'Navigation' },
  { keys: '⌘\\',     description: 'Toggle theme',            category: 'Navigation' },
  { keys: '⌘↵',      description: 'Copy share URL',          category: 'Navigation' },
  { keys: '?',        description: 'Show keyboard shortcuts', category: 'Navigation' },
  { keys: 'Esc',      description: 'Close dialog / drawer',   category: 'Navigation' },
  { keys: 'i',        description: 'Inference mode',          category: 'Modes' },
  { keys: 's',        description: 'Scale mode',              category: 'Modes' },
  { keys: 'f',        description: 'Fine-tune mode',          category: 'Modes' },
  { keys: 't',        description: 'Train mode',              category: 'Modes' },
  { keys: 'r',        description: 'Reverse mode',            category: 'Modes' },
  { keys: 'c',        description: 'Add config to compare',   category: 'Actions' },
  { keys: 'g m',      description: 'Go to Models page',       category: 'Go to' },
  { keys: 'g h',      description: 'Go to Hardware page',     category: 'Go to' },
];

const MODE_KEY_MAP: Record<string, WorkloadMode> = {
  i: 'inference',
  s: 'scale',
  f: 'finetune',
  t: 'train',
  r: 'reverse',
};

interface ShortcutHandlers {
  openModelSearch: () => void;
  toggleTheme: () => void;
  copyShareURL: () => void;
  openShortcutsModal: () => void;
  setMode: (mode: WorkloadMode) => void;
  addCompare: () => void;
  navigate: (path: string) => void;
}

function isInputFocused(): boolean {
  const tag = document.activeElement?.tagName.toLowerCase();
  const role = document.activeElement?.getAttribute('role');
  return (
    tag === 'input' ||
    tag === 'textarea' ||
    tag === 'select' ||
    role === 'combobox' ||
    (document.activeElement as HTMLElement)?.isContentEditable === true
  );
}

export function registerKeyboardShortcuts(handlers: ShortcutHandlers): () => void {
  let gPressed = false;
  let gTimer: ReturnType<typeof setTimeout> | null = null;

  const handleKeyDown = (e: KeyboardEvent) => {
    const meta = e.metaKey || e.ctrlKey;

    // ── ⌘K — open model search ──────────────────────────────────────
    if (meta && e.key === 'k') {
      e.preventDefault();
      handlers.openModelSearch();
      return;
    }

    // ── ⌘\ — toggle theme ───────────────────────────────────────────
    if (meta && e.key === '\\') {
      e.preventDefault();
      handlers.toggleTheme();
      return;
    }

    // ── ⌘Enter — copy share URL ─────────────────────────────────────
    if (meta && e.key === 'Enter') {
      e.preventDefault();
      handlers.copyShareURL();
      return;
    }

    // All remaining shortcuts require no input focused
    if (isInputFocused()) return;

    // ── ? — open shortcuts modal ─────────────────────────────────────
    if (e.key === '?') {
      e.preventDefault();
      handlers.openShortcutsModal();
      return;
    }

    // ── g-sequence navigation ────────────────────────────────────────
    if (e.key === 'g' && !gPressed) {
      gPressed = true;
      if (gTimer) clearTimeout(gTimer);
      gTimer = setTimeout(() => { gPressed = false; }, 1000);
      return;
    }

    if (gPressed) {
      gPressed = false;
      if (gTimer) clearTimeout(gTimer);
      if (e.key === 'm') { e.preventDefault(); handlers.navigate('/models'); return; }
      if (e.key === 'h') { e.preventDefault(); handlers.navigate('/hardware'); return; }
    }

    // ── Mode switching ───────────────────────────────────────────────
    const mode = MODE_KEY_MAP[e.key];
    if (mode) {
      e.preventDefault();
      handlers.setMode(mode);
      return;
    }

    // ── c — add to compare ───────────────────────────────────────────
    if (e.key === 'c') {
      e.preventDefault();
      handlers.addCompare();
      return;
    }
  };

  document.addEventListener('keydown', handleKeyDown);
  return () => {
    document.removeEventListener('keydown', handleKeyDown);
    if (gTimer) clearTimeout(gTimer);
  };
}
