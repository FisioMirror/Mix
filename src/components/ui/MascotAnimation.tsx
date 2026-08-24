import { useState } from 'react';

/**
 * Tipos de animación de la mascota Physi.
 * Cada tipo mapea a un archivo .webp específico en /animations/mascot/.
 */
export type MascotType =
  | 'idle'
  | 'greeting'
  | 'success'
  | 'error'
  | 'loading'
  | 'scanning'
  | 'speaking'
  | 'achievement'
  | 'notification'
  | 'goodbye';

/** Tamaños predefinidos responsivos (móvil / escritorio) en píxeles. */
const SIZE_PRESETS: Record<string, { mobile: string; desktop: string }> = {
  // 80px móvil → 120px escritorio (por defecto)
  md: { mobile: 'w-20 h-20', desktop: 'lg:w-[120px] lg:h-[120px]' },
  // 64px móvil → 96px escritorio (avatares de chat, iconos compactos)
  sm: { mobile: 'w-16 h-16', desktop: 'lg:w-24 lg:h-24' },
  // 44px móvil → 56px escritorio (badges, cabeceras de panel)
  xs: { mobile: 'w-11 h-11', desktop: 'lg:w-14 lg:h-14' },
  // 56px móvil → 80px escritorio (racha, tarjetas pequeñas)
  racha: { mobile: 'w-14 h-14', desktop: 'lg:w-20 lg:h-20' },
};

interface MascotAnimationProps {
  /** Tipo de animación a mostrar */
  type: MascotType;
  /**
   * Tamaño predefinido responsivo.
   * - `md` (por defecto): 80px móvil → 120px escritorio
   * - `sm`: 64px → 96px (avatares de chat)
   * - `xs`: 44px → 56px (iconos compactos)
   * - `racha`: 56px → 80px (tarjetas de racha)
   */
  size?: keyof typeof SIZE_PRESETS;
  /** Texto alternativo descriptivo (se genera automáticamente si se omite) */
  alt?: string;
  /** Clase CSS adicional para el contenedor */
  className?: string;
}

/** Mapa de tipo → archivo webp + texto alternativo por defecto */
const MASCOT_CONFIG: Record<
  MascotType,
  { src: string; alt: string }
> = {
  idle:         { src: '/animations/mascot/idle.webp',         alt: 'Mascota Physi en reposo' },
  greeting:     { src: '/animations/mascot/saludo.webp',       alt: 'Mascota Physi saludando' },
  success:      { src: '/animations/mascot/exito.webp',        alt: 'Mascota Physi celebrando el éxito' },
  error:        { src: '/animations/mascot/error.webp',        alt: 'Mascota Physi con error' },
  loading:      { src: '/animations/mascot/cargando.webp',     alt: 'Mascota Physi cargando' },
  scanning:     { src: '/animations/mascot/escaneando.webp',   alt: 'Mascota Physi escaneando' },
  speaking:     { src: '/animations/mascot/consejo.webp', alt: 'Mascota Physi hablando' },
  achievement:  { src: '/animations/mascot/racha.webp',        alt: 'Mascota Physi celebrando un logro' },
  notification: { src: '/animations/mascot/notificacion.webp', alt: 'Mascota Physi con notificaciones' },
  goodbye:      { src: '/animations/mascot/despedida.webp',    alt: 'Mascota Physi despidiéndose' },
};

/**
 * Componente reutilizable para renderizar la mascota Physi con animación.
 *
 * - Tamaño responsive: ~80px en móvil → ~120px en escritorio (preset `md`).
 * - Animación CSS `animate-breathe` aplicada para movimiento sutil continuo
 *   que nunca se congela (loop infinito ease-in-out).
 * - Manejo de error: si el .webp no carga, se oculta sin romper el layout.
 * - Usa la clase `.mascot-container` del design system (borde circular + iluminación).
 *
 * @example
 * <MascotAnimation type="greeting" />
 * <MascotAnimation type="scanning" size="md" className="mx-auto mb-4" />
 */
export default function MascotAnimation({
  type,
  size = 'md',
  alt,
  className = '',
}: MascotAnimationProps) {
  const [visible, setVisible] = useState(true);
  const config = MASCOT_CONFIG[type];
  const preset = SIZE_PRESETS[size];

  if (!visible) return null;

  return (
    <div
      className={`mascot-container ${preset.mobile} ${preset.desktop} ${className}`.trim()}
    >
      <img
        src={config.src}
        alt={alt ?? config.alt}
        className="w-full h-full object-contain animate-breathe will-change-transform"
        onError={() => setVisible(false)}
        draggable={false}
      />
    </div>
  );
}
