import { type CSSProperties } from 'react';

interface IconProps {
  name: string;
  className?: string;
  style?: CSSProperties;
  filled?: boolean;
  size?: number;
}

export function Icon({ name, className = '', style, filled = false, size }: IconProps) {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={{
        fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' 24`,
        fontSize: size ? `${size}px` : undefined,
        ...style,
      }}
    >
      {name}
    </span>
  );
}
