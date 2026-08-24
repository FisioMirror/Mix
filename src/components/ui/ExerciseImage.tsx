import { Icon } from './Icon';
import { cn } from '../../lib/utils';

interface ExerciseImageProps {
  /** URL de la imagen del ejercicio (de Pexels). Si es undefined, se muestra el fallback. */
  src?: string;
  /** Nombre del ejercicio, usado en el fallback y como texto alternativo. */
  name: string;
  /** Clases adicionales para el contenedor. */
  className?: string;
  /** Altura del banner. Por defecto h-40. */
  heightClass?: string;
}

/**
 * Muestra la imagen de un ejercicio como banner superior de la tarjeta.
 * Si no hay imagen, muestra un fallback con icono de pesa y el nombre del ejercicio.
 * Todo el texto está en español y no se usan colores púrpura/violeta.
 */
export function ExerciseImage({ src, name, className, heightClass = 'h-40' }: ExerciseImageProps) {
  if (src) {
    return (
      <div className={cn('relative w-full overflow-hidden rounded-2xl mb-4', heightClass, className)}>
        <img
          src={src}
          alt={name}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {/* Gradiente sutil inferior para legibilidad del nombre */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/55 to-transparent pointer-events-none" />
        <span className="absolute bottom-2 left-3 right-3 text-white font-title-md text-title-md drop-shadow line-clamp-1">
          {name}
        </span>
      </div>
    );
  }

  // Fallback: icono de pesa + nombre del ejercicio
  return (
    <div
      className={cn(
        'relative w-full overflow-hidden rounded-2xl mb-4 flex flex-col items-center justify-center gap-2 bg-primary/10 text-primary animate-breathe-icon',
        heightClass,
        className,
      )}
    >
      <Icon name="self_improvement" filled size={40} />
      <span className="font-title-md text-title-md text-primary text-center px-4 line-clamp-2">
        {name}
      </span>
    </div>
  );
}
