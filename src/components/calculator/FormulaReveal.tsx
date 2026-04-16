import * as React from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { ChevronDown, ChevronUp, Sigma } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FormulaInput {
  label: string;
  value: string | number;
  unit?: string;
}

interface FormulaRevealProps {
  title: string;
  formula: string;          // LaTeX string
  inputs: FormulaInput[];
  result: string;
  source?: string;
  sourceUrl?: string;
  className?: string;
}

function KaTeXFormula({ formula }: { formula: string }) {
  const html = React.useMemo(() => {
    try {
      return katex.renderToString(formula, {
        throwOnError: false,
        output: 'mathml',   // MathML for screen reader accessibility
        displayMode: true,
      });
    } catch {
      return `<span class="text-red-500 text-xs">Formula render error</span>`;
    }
  }, [formula]);

  return (
    <div
      className="overflow-x-auto py-2"
      dangerouslySetInnerHTML={{ __html: html }}
      aria-label={`Formula: ${formula}`}
    />
  );
}

export function FormulaReveal({ title, formula, inputs, result, source, sourceUrl, className }: FormulaRevealProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className={cn('border border-border-subtle rounded-lg overflow-hidden', className)}>
      {/* Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm text-fg-muted hover:text-fg-default hover:bg-bg-subtle transition-colors"
        aria-expanded={isOpen}
        aria-controls={`formula-${title.replace(/\s+/g, '-').toLowerCase()}`}
      >
        <div className="flex items-center gap-2">
          <Sigma size={14} />
          <span className="font-medium">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-fg-muted">{result}</span>
          {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>

      {/* Content */}
      {isOpen && (
        <div
          id={`formula-${title.replace(/\s+/g, '-').toLowerCase()}`}
          className="border-t border-border-subtle px-4 py-4 space-y-4 bg-bg-subtle"
        >
          {/* Formula */}
          <div className="text-fg-default">
            <KaTeXFormula formula={formula} />
          </div>

          {/* Inputs table */}
          {inputs.length > 0 && (
            <div>
              <h4 className="text-[11px] font-medium uppercase tracking-wider text-fg-muted mb-2">
                Inputs
              </h4>
              <div className="space-y-1">
                {inputs.map((input, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-fg-muted">{input.label}</span>
                    <span className="font-mono text-fg-default tabular-nums">
                      {input.value}{input.unit ? ` ${input.unit}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Result */}
          <div className="flex items-center justify-between text-xs border-t border-border-subtle pt-3">
            <span className="font-medium text-fg-default">Result</span>
            <span className="font-mono font-semibold text-fg-primary">{result}</span>
          </div>

          {/* Source citation */}
          {source && (
            <div className="text-[10px] text-fg-muted">
              Source:{' '}
              {sourceUrl ? (
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-fg-default"
                >
                  {source}
                </a>
              ) : (
                source
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
