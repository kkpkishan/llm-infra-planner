import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/lib/use-theme';
import { useCalculatorStore } from '@/store/calculator-store';
import { useToast } from '@/components/feedback/Toast';
import { registerKeyboardShortcuts } from '@/lib/keyboard-shortcuts';

interface UseKeyboardShortcutsOptions {
  onOpenModelSearch: () => void;
  onOpenShortcutsModal: () => void;
}

export function useKeyboardShortcuts({
  onOpenModelSearch,
  onOpenShortcutsModal,
}: UseKeyboardShortcutsOptions) {
  const navigate = useNavigate();
  const { toggleTheme } = useTheme();
  const { setMode, addCompareConfig, compareConfigs, getShareURL } = useCalculatorStore();
  const { showToast } = useToast();

  React.useEffect(() => {
    const cleanup = registerKeyboardShortcuts({
      openModelSearch: onOpenModelSearch,
      toggleTheme,
      copyShareURL: async () => {
        const url = getShareURL();
        try {
          await navigator.clipboard.writeText(url);
        } catch {
          const input = document.createElement('input');
          input.value = url;
          input.style.cssText = 'position:fixed;opacity:0';
          document.body.appendChild(input);
          input.select();
          document.execCommand('copy');
          document.body.removeChild(input);
        }
        showToast('Link copied to clipboard', 'success');
      },
      openShortcutsModal: onOpenShortcutsModal,
      setMode,
      addCompare: () => {
        if (compareConfigs.length >= 3) {
          showToast('Maximum 3 configurations', 'error');
          return;
        }
        addCompareConfig();
        showToast('Added to compare — opening compare page', 'success');
        navigate('/compare');
      },
      navigate: (path) => navigate(path),
    });

    return cleanup;
  }, [
    onOpenModelSearch,
    onOpenShortcutsModal,
    toggleTheme,
    setMode,
    addCompareConfig,
    compareConfigs.length,
    getShareURL,
    showToast,
    navigate,
  ]);
}
