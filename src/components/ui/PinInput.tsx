import { useRef, type ChangeEvent, type KeyboardEvent, type ClipboardEvent } from 'react';
import { cn } from '../../lib/utils';

interface PinInputProps {
  /** Current token value (string of digits, max `length` chars). */
  value: string;
  /** Called whenever the digits change. */
  onChange: (digits: string) => void;
  /** Called when all `length` boxes are filled. */
  onComplete?: (digits: string) => void;
  /** Number of boxes. Default 6. */
  length?: number;
  /** Disable all boxes (e.g. while submitting). */
  disabled?: boolean;
  /** Auto-focus the first box on mount. */
  autoFocus?: boolean;
  /** Extra classes for each input box. */
  boxClassName?: string;
  /** Extra classes for the wrapper. */
  className?: string;
}

/**
 * 6-box PIN input with auto-advance, backspace-to-previous, and paste support.
 * Digits only. The combined digits are reported via `onChange` / `onComplete`.
 */
export function PinInput({
  value,
  onChange,
  onComplete,
  length = 6,
  disabled,
  autoFocus,
  boxClassName,
  className,
}: PinInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const firstMount = useRef(false);

  // Normalize the incoming value into per-box chars (space-padded for empty).
  const digits = value.replace(/\D/g, '').slice(0, length).padEnd(length, ' ').split('');

  const focusBox = (index: number) => {
    const clamped = Math.max(0, Math.min(index, length - 1));
    inputsRef.current[clamped]?.focus();
    requestAnimationFrame(() => inputsRef.current[clamped]?.select());
  };

  const commit = (next: string[]) => {
    const joined = next.map((d) => d.trim()).join('');
    onChange(joined);
    if (joined.length === length && !joined.includes(' ') && onComplete) onComplete(joined);
  };

  const handleChange = (index: number, e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const cleaned = raw.replace(/\D/g, '');
    if (!cleaned) {
      // user cleared the box
      const next = [...digits];
      next[index] = ' ';
      commit(next);
      return;
    }
    // Take the last typed digit (handles typing over an existing value).
    const newChar = cleaned.slice(-1);
    const next = [...digits];
    next[index] = newChar;
    commit(next);
    if (index < length - 1) focusBox(index + 1);
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const next = [...digits];
      if (next[index].trim() === '') {
        // current empty -> move back and clear previous
        if (index > 0) {
          next[index - 1] = ' ';
          commit(next);
          focusBox(index - 1);
        }
      } else {
        // current has a digit -> clear it, stay put
        next[index] = ' ';
        commit(next);
      }
      return;
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (index > 0) focusBox(index - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (index < length - 1) focusBox(index + 1);
    } else if (e.key === 'Enter') {
      // allow form submission
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!pasted) return;
    const next = Array(length).fill(' ');
    pasted.split('').forEach((d, i) => { next[i] = d; });
    commit(next);
    focusBox(Math.min(pasted.length, length - 1));
  };

  // Auto-focus first box on mount
  if (!firstMount.current && autoFocus) {
    firstMount.current = true;
    requestAnimationFrame(() => inputsRef.current[0]?.focus());
  }

  return (
    <div className={cn('flex justify-center gap-2 sm:gap-3', className)}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { inputsRef.current[i] = el; }}
          value={d.trim()}
          disabled={disabled}
          maxLength={1}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          aria-label={`Dígito ${i + 1} de ${length}`}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          className={cn(
            'glass-input h-16 w-12 rounded-xl border border-white/40 bg-white/20 text-center font-sans text-3xl font-bold text-primary outline-none transition-all placeholder:text-on-surface/30 focus:border-primary/60 focus:bg-white/50 focus:shadow-[0_0_0_4px_rgba(0,80,77,0.12)] disabled:opacity-50',
            boxClassName,
          )}
          placeholder="•"
        />
      ))}
    </div>
  );
}

export default PinInput;
