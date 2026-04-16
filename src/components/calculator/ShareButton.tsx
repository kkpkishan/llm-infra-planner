import * as React from 'react';
import { Share2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCalculatorStore } from '@/store/calculator-store';
import { useToast } from '@/components/feedback/Toast';

interface ShareButtonProps {
  className?: string;
}

export function ShareButton({ className }: ShareButtonProps) {
  const [copied, setCopied] = React.useState(false);
  const { getShareURL } = useCalculatorStore();
  const { showToast } = useToast();

  const handleShare = async () => {
    const url = getShareURL();
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Fallback: create a temporary input and select it
      const input = document.createElement('input');
      input.value = url;
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }
    setCopied(true);
    showToast('Link copied to clipboard', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleShare}
      className={cn(
        'h-8 px-3 rounded-md text-sm font-medium flex items-center gap-1.5',
        'bg-bg-muted border border-border-subtle text-fg-primary',
        'hover:bg-bg-emphasis transition-colors duration-fast',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className
      )}
      aria-label="Copy share link (⌘Enter)"
      title="Share (⌘Enter)"
    >
      {copied ? <Check size={14} className="text-green-500" /> : <Share2 size={14} />}
      {copied ? 'Copied!' : 'Share'}
    </button>
  );
}
