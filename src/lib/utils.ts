import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Devuelve una marca de tiempo relativa en español, p. ej. "hace 5 min", "hace 2 h",
 * "hace 3 días", o la fecha completa si es más antigua que una semana.
 */
export function timeAgo(dateInput: string | Date): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const now = Date.now();
  const diffMs = now - date.getTime();
  if (Number.isNaN(diffMs)) return '';

  const sec = Math.round(diffMs / 1000);
  const min = Math.round(sec / 60);
  const hr = Math.round(min / 60);
  const day = Math.round(hr / 24);

  if (sec < 45) return 'ahora mismo';
  if (min < 60) return `hace ${min} min`;
  if (hr < 24) return `hace ${hr} h`;
  if (day === 1) return 'ayer';
  if (day < 7) return `hace ${day} días`;
  // Más de una semana: fecha completa compacta en español
  return date.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
}

/**
 * Comprime y redimensiona una imagen usando la API Canvas.
 *
 * - Redimensiona para que el lado mayor no supere `maxSize` píxeles
 *   (por defecto 300px, ideal para avatares cuadrados).
 * - Convierte siempre a JPEG y reduce la calidad de forma iterativa hasta
 *   que el archivo resultante quede por debajo de `maxBytes` (por defecto
 *   1MB). Si con la calidad mínima (0.5) aún supera el límite, devuelve el
 *   resultado más pequeño posible sin lanzar error — la verificación de
 *   tamaño duro la hace el llamador con un mensaje claro.
 *
 * Devuelve un `File` con extensión `.jpg` y tipo `image/jpeg`.
 */
export async function compressImage(
  file: File,
  maxSize: number = 300,
  quality: number = 0.85,
  maxBytes: number = 1024 * 1024, // 1MB por defecto
): Promise<File> {
  // Rechazar formatos no soportados antes de decodificar.
  if (!file.type.startsWith('image/')) {
    throw new Error('El archivo no es una imagen válida');
  }

  const dataUrl = await readFileAsDataURL(file);
  const img = await loadImage(dataUrl);

  let { width, height } = img;
  if (width > height) {
    if (width > maxSize) { height = (height * maxSize) / width; width = maxSize; }
  } else {
    if (height > maxSize) { width = (width * maxSize) / height; height = maxSize; }
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width);
  canvas.height = Math.round(height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo procesar la imagen');

  // Fondo blanco para que PNG con transparencia no quede negro en JPEG.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  // Reducir calidad iterativamente hasta quedar por debajo de maxBytes.
  let currentQuality = quality;
  const minQuality = 0.5;
  let blob: Blob | null = null;

  while (currentQuality >= minQuality) {
    blob = await canvasToBlob(canvas, 'image/jpeg', currentQuality);
    if (blob && blob.size <= maxBytes) break;
    currentQuality -= 0.1;
  }

  if (!blob) throw new Error('No se pudo comprimir la imagen');

  return new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' });
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('La imagen está corrupta o no se puede cargar'));
    img.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

