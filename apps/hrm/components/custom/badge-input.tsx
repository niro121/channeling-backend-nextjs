'use client';

import {
  useCallback,
  useState,
  type KeyboardEvent,
  type ClipboardEvent
} from 'react';
import { X } from 'lucide-react';
import { Badge, Input, Label, cn } from '@archmage/ui';

export type BadgeInputProps = {
  id?: string;
  label?: string;
  value: string[];
  onChange: (items: string[]) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
};

function normalizeItem(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

function parseItemsChunk(raw: string): string[] {
  return raw
    .split(/[,;\n]+/)
    .map(normalizeItem)
    .filter(Boolean);
}

/** Reusable typed-text → badge chips input (Enter / comma / paste). */
export function BadgeInput({
  id = 'badge-input',
  label,
  value,
  onChange,
  onBlur,
  placeholder = 'Type and press Enter',
  disabled = false,
  required = false,
  className
}: BadgeInputProps) {
  const [draft, setDraft] = useState('');

  const addItems = useCallback(
    (incoming: string[]) => {
      if (!incoming.length) return;
      const next = [...value];
      for (const item of incoming) {
        const exists = next.some(
          (existing) => existing.toLowerCase() === item.toLowerCase()
        );
        if (!exists) next.push(item);
      }
      onChange(next);
    },
    [onChange, value]
  );

  const commitDraft = useCallback(() => {
    const items = parseItemsChunk(draft);
    if (!items.length) return;
    addItems(items);
    setDraft('');
  }, [addItems, draft]);

  const removeItem = useCallback(
    (item: string) => {
      onChange(value.filter((existing) => existing !== item));
    },
    [onChange, value]
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      commitDraft();
      return;
    }

    if (event.key === 'Backspace' && !draft && value.length) {
      removeItem(value[value.length - 1]!);
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const text = event.clipboardData.getData('text');
    if (
      !text ||
      (!text.includes(',') && !text.includes(';') && !text.includes('\n'))
    ) {
      return;
    }
    event.preventDefault();
    addItems(parseItemsChunk(`${draft}${text}`));
    setDraft('');
  };

  return (
    <div className={cn('grid grid-cols-1 gap-1.5 items-start', className)}>
      {label ? (
        <Label htmlFor={id} className="text-sm font-semibold text-foreground">
          {label}
          {required ? <span className="text-red-600"> *</span> : null}
        </Label>
      ) : null}

      <div
        className={cn(
          'flex min-h-10 flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1.5',
          disabled && 'cursor-not-allowed opacity-60'
        )}
      >
        {value.map((item) => (
          <Badge
            key={item}
            variant="secondary"
            className="gap-1 border-0 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary hover:bg-primary/15"
          >
            {item}
            {!disabled ? (
              <button
                type="button"
                className="rounded-full p-0.5 hover:bg-primary/20"
                aria-label={`Remove ${item}`}
                onClick={() => removeItem(item)}
              >
                <X className="h-3 w-3" />
              </button>
            ) : null}
          </Badge>
        ))}

        <Input
          id={id}
          value={draft}
          disabled={disabled}
          placeholder={value.length ? '' : placeholder}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={() => {
            commitDraft();
            onBlur?.();
          }}
          className="h-7 min-w-40 flex-1 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
        />
      </div>
    </div>
  );
}
