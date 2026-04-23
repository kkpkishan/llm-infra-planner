import * as React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { PageShell } from '@/components/layout/PageShell';
import { ShortcutsModal } from '@/components/layout/ShortcutsModal';
import { CompareDrawer } from '@/components/calculator/CompareDrawer';
import { Home } from '@/pages/Home';
import { Compare } from '@/pages/Compare';
import { Reverse } from '@/pages/Reverse';
import { Models } from '@/pages/Models';
import { Hardware } from '@/pages/Hardware';
import { Guides } from '@/pages/Guides';
import { useCalculatorStore } from '@/store/calculator-store';
import { useToast } from '@/components/feedback/Toast';
import { useKeyboardShortcuts } from '@/lib/use-keyboard-shortcuts';

function AppContent() {
  const location = useLocation();
  const { getShareURL, addCompareConfig, compareConfigs } = useCalculatorStore();
  const { showToast } = useToast();
  const [shortcutsOpen, setShortcutsOpen] = React.useState(false);
  const [compareOpen, setCompareOpen] = React.useState(false);

  // Fire GA page_view on every route change
  React.useEffect(() => {
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'page_view', {
        page_path: location.pathname + location.search,
        page_title: document.title,
        page_location: window.location.href,
      });
    }
  }, [location]);

  useKeyboardShortcuts({
    onOpenModelSearch: () => document.dispatchEvent(new CustomEvent('llmcalc:open-model-search')),
    onOpenShortcutsModal: () => setShortcutsOpen(true),
  });

  const handleShare = async () => {
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
  };

  const handleCompare = () => {
    if (compareConfigs.length >= 3) {
      showToast('Maximum 3 configurations', 'error');
      return;
    }
    addCompareConfig();
    showToast('Added to compare', 'success');
    setCompareOpen(true);
  };

  const showModeTabs = ['/', '/compare', '/reverse'].includes(location.pathname);

  return (
    <>
      <PageShell
        currentPath={location.pathname}
        onShare={handleShare}
        onCompare={handleCompare}
        showModeTabs={showModeTabs}
        onOpenShortcuts={() => setShortcutsOpen(true)}
      >
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/reverse" element={<Reverse />} />
          <Route path="/models" element={<Models />} />
          <Route path="/hardware" element={<Hardware />} />
          <Route path="/guides" element={<Guides />} />
        </Routes>
      </PageShell>

      <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <CompareDrawer open={compareOpen} onClose={() => setCompareOpen(false)} />
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
