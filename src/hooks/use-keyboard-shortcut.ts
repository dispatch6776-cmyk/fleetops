import { useEffect } from 'react';

export interface ShortcutOptions {
  key: string;
  meta?: boolean;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  /** Fire even when focus is inside an input/textarea. Default: false. */
  allowInInput?: boolean;
  enabled?: boolean;
}

const EDITABLE = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

function isEditableTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  if (!element) return false;
  return EDITABLE.has(element.tagName) || element.isContentEditable;
}

/**
 * Registers a global keyboard shortcut.
 * `meta` matches ⌘ on macOS and Ctrl on Windows/Linux when combined with `ctrl`.
 */
export function useKeyboardShortcut(
  { key, meta, ctrl, shift, alt, allowInInput = false, enabled = true }: ShortcutOptions,
  handler: (event: KeyboardEvent) => void,
) {
  useEffect(() => {
    if (!enabled) return;
    const listener = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== key.toLowerCase()) return;
      const modifierOk =
        (meta || ctrl ? event.metaKey || event.ctrlKey : !event.metaKey && !event.ctrlKey) &&
        (shift ? event.shiftKey : !shift || event.shiftKey) &&
        (alt ? event.altKey : true);
      if (!modifierOk) return;
      if (shift && !event.shiftKey) return;
      if (!allowInInput && isEditableTarget(event.target)) return;
      handler(event);
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [key, meta, ctrl, shift, alt, allowInInput, enabled, handler]);
}
