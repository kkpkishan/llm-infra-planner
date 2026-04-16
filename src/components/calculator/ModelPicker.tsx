import * as React from 'react';
import { Check, ChevronsUpDown, Cpu } from 'lucide-react';
import Fuse from 'fuse.js';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/primitives/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/primitives/command';
import type { ModelSpec } from '@/lib/formulas/types';

interface ModelPickerProps {
  models: ModelSpec[];
  value: ModelSpec | null;
  onSelect: (model: ModelSpec) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

// Family display names and colors
const FAMILY_CONFIG: Record<string, { label: string; color: string }> = {
  llama: { label: 'Llama', color: 'bg-violet-500/10 text-violet-700 dark:text-violet-400' },
  mistral: { label: 'Mistral', color: 'bg-orange-500/10 text-orange-700 dark:text-orange-400' },
  qwen: { label: 'Qwen', color: 'bg-blue-500/10 text-blue-700 dark:text-blue-400' },
  deepseek: { label: 'DeepSeek', color: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400' },
  gemma: { label: 'Gemma', color: 'bg-green-500/10 text-green-700 dark:text-green-400' },
  phi: { label: 'Phi', color: 'bg-purple-500/10 text-purple-700 dark:text-purple-400' },
};

// Model type badges
function getModelBadges(model: ModelSpec): string[] {
  const badges: string[] = [];
  if (model.moe) badges.push('MoE');
  if (model.displayName.toLowerCase().includes('vision')) badges.push('VLM');
  if (model.displayName.toLowerCase().includes('instruct') || model.displayName.toLowerCase().includes('chat')) {
    badges.push('Instruct');
  } else {
    badges.push('Base');
  }
  return badges;
}

// Recent selections from localStorage
const RECENT_KEY = 'llmcalc-recent-models';
function getRecentModels(): string[] {
  try {
    const stored = localStorage.getItem(RECENT_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function addRecentModel(modelId: string) {
  try {
    const recent = getRecentModels();
    const updated = [modelId, ...recent.filter(id => id !== modelId)].slice(0, 5);
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
  } catch {
    // Ignore localStorage errors
  }
}

export function ModelPicker({ models, value, onSelect, open: controlledOpen, onOpenChange: controlledOnChange, className }: ModelPickerProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = (v: boolean) => {
    setInternalOpen(v);
    controlledOnChange?.(v);
  };
  const [search, setSearch] = React.useState('');
  const recentIds = getRecentModels();

  // Fuzzy search with Fuse.js
  const fuse = React.useMemo(
    () =>
      new Fuse(models, {
        keys: ['displayName', 'id', 'family'],
        threshold: 0.3,
        includeScore: true,
      }),
    [models]
  );

  const searchResults = React.useMemo(() => {
    if (!search.trim()) return models;
    return fuse.search(search).map(result => result.item);
  }, [search, fuse, models]);

  // Group by family
  const groupedResults = React.useMemo(() => {
    const groups: Record<string, ModelSpec[]> = {};
    searchResults.forEach(model => {
      if (!groups[model.family]) groups[model.family] = [];
      groups[model.family].push(model);
    });
    return groups;
  }, [searchResults]);

  // Recent models
  const recentModels = React.useMemo(() => {
    return recentIds
      .map(id => models.find(m => m.id === id))
      .filter((m): m is ModelSpec => m !== undefined);
  }, [recentIds, models]);

  const handleSelect = (model: ModelSpec) => {
    onSelect(model);
    addRecentModel(model.id);
    setOpen(false);
    setSearch('');
  };

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label
        htmlFor="model-picker"
        className="text-xs font-medium text-fg-default flex items-center gap-1.5"
      >
        <Cpu size={14} className="text-fg-muted" />
        Model
        <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-bg-muted px-1.5 font-mono text-[10px] font-medium text-fg-muted">
          ⌘K
        </kbd>
      </label>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          id="model-picker"
          role="combobox"
          aria-expanded={open}
          aria-controls="model-list"
          aria-haspopup="listbox"
          className="w-full justify-between font-normal h-9 px-3 rounded-md border border-border-subtle bg-bg-muted text-sm text-fg-default hover:bg-bg-emphasis focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {value ? (
            <span className="flex items-center gap-2 truncate">
              <span
                className={cn(
                  'text-[10px] font-medium px-1.5 py-0.5 rounded',
                  FAMILY_CONFIG[value.family]?.color || 'bg-bg-muted text-fg-muted'
                )}
              >
                {FAMILY_CONFIG[value.family]?.label || value.family}
              </span>
              {value.displayName}
            </span>
          ) : (
            <span className="text-fg-muted">Select model...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </PopoverTrigger>

        <PopoverContent className="w-[400px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search models..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList id="model-list" role="listbox">
              <CommandEmpty>No models found.</CommandEmpty>

              {/* Recent selections */}
              {!search && recentModels.length > 0 && (
                <CommandGroup heading="Recent">
                  {recentModels.map(model => (
                    <CommandItem
                      key={model.id}
                      value={model.id}
                      onSelect={() => handleSelect(model)}
                      role="option"
                      aria-selected={value?.id === model.id}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          value?.id === model.id ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span
                          className={cn(
                            'text-[10px] font-medium px-1.5 py-0.5 rounded flex-shrink-0',
                            FAMILY_CONFIG[model.family]?.color || 'bg-bg-muted text-fg-muted'
                          )}
                        >
                          {FAMILY_CONFIG[model.family]?.label || model.family}
                        </span>
                        <span className="truncate">{model.displayName}</span>
                        <div className="ml-auto flex gap-1 flex-shrink-0">
                          {getModelBadges(model).map(badge => (
                            <span
                              key={badge}
                              className="text-[9px] font-medium px-1 py-0.5 rounded bg-bg-muted text-fg-muted"
                            >
                              {badge}
                            </span>
                          ))}
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {/* Grouped by family */}
              {Object.entries(groupedResults).map(([family, familyModels]) => (
                <CommandGroup
                  key={family}
                  heading={FAMILY_CONFIG[family]?.label || family}
                >
                  {familyModels.map(model => (
                    <CommandItem
                      key={model.id}
                      value={model.id}
                      onSelect={() => handleSelect(model)}
                      role="option"
                      aria-selected={value?.id === model.id}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          value?.id === model.id ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="truncate">{model.displayName}</span>
                        <div className="ml-auto flex gap-1 flex-shrink-0">
                          {getModelBadges(model).map(badge => (
                            <span
                              key={badge}
                              className="text-[9px] font-medium px-1 py-0.5 rounded bg-bg-muted text-fg-muted"
                            >
                              {badge}
                            </span>
                          ))}
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
