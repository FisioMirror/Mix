import { useRef, useState, type KeyboardEvent, type ClipboardEvent } from 'react';
import { cn } from '../../lib/utils';

interface TokenInputProps {
  length?: number;
  onComplete?: (token: string) => void;
  onChange?: (token: string) => void;
  className?: string;
}

export function TokenInput({ length = 6, onComplete, onChange, className }: TokenInputProps) {
  const [values, setValues] = useState<string[]>(Array(length).fill(''));
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, value: string) => {
    if (!/^[a-zA-Z0-9]?$/.test(value)) return;
    const newValues = [...values];
    newValues[index] = value.toUpperCase();
    setValues(newValues);
    if (value && index < length - 1) inputsRef.current[index + 1]?.focus();
    const token = newValues.join('');
    onChange?.(token);
    if (token.length === length && !newValues.includes('')) onComplete?.(token);
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !values[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const paste = e.clipboardData.getData('text').slice(0, length).split('');
    const newValues = [...values];
    paste.forEach((char, i) => { if (i < length) newValues[i] = char.toUpperCase(); });
    setValues(newValues);
    const nextIndex = Math.min(paste.length, length - 1);
    inputsRef.current[nextIndex]?.focus();
    const token = newValues.join('');
    onChange?.(token);
    if (token.length === length && !newValues.includes('')) onComplete?.(token);
  };

  return (
    <div className={cn('flex gap-2 sm:gap-3 justify-center', className)}>
      {values.map((val, i) => (
        <input
          key={i}
          ref={(el) => { inputsRef.current[i] = el; }}
          value={val}
          maxLength={1}
          type="text"
          inputMode="text"
          placeholder="•"
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={i === 0 ? handlePaste : undefined}
          className={cn(
            'glass-input w-11 h-14 sm:w-12 sm:h-16 rounded-xl text-center font-display-lg text-display-lg text-primary',
            'focus:outline-none bg-white/20 border border-white/40',
            'focus:bg-white/50 focus:border-primary/50 focus:shadow-[0_0_0_4px_rgba(0,80,77,0.1)]',
            'transition-all uppercase',
          )}
        />
      ))}
    </div>
  );
}
