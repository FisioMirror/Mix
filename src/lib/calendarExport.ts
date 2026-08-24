/**
 * Genera un enlace de Google Calendar con los ejercicios de la rutina del paciente.
 * Cada ejercicio se convierte en un evento recurrente de 30 min.
 */

export interface CalendarExercise {
  nombre: string;
  series?: number | null;
  repeticiones?: number | null;
  frecuencia_semana?: number | null;
}

function formatDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function getNextWeekday(target: number): Date {
  const now = new Date();
  const current = now.getDay();
  let diff = target - current;
  if (diff < 0) diff += 7;
  if (diff === 0 && now.getHours() >= 9) diff = 7;
  const result = new Date(now);
  result.setDate(now.getDate() + diff);
  result.setHours(9, 0, 0, 0);
  return result;
}

const DAY_MAP: Record<number, number> = {
  0: 0, // Domingo
  1: 1, // Lunes
  2: 2,
  3: 3,
  4: 4,
  5: 5,
  6: 6, // Sábado
};

export function buildGoogleCalendarUrl(exercises: CalendarExercise[], patientName: string): string {
  if (exercises.length === 0) return '';

  const freq = exercises[0].frecuencia_semana || 3;
  const daysPerWeek = Math.min(freq, 7);
  const dayOffsets = Array.from({ length: daysPerWeek }, (_, i) =>
    Math.floor((i * 7) / daysPerWeek),
  );

  const baseDate = getNextWeekday(1);
  const exerciseSummary = exercises.map((ex) =>
    `${ex.nombre} (${ex.series ?? 3}x${ex.repeticiones ?? 10})`,
  ).join(', ');

  const params = new URLSearchParams();
  params.set('action', 'TEMPLATE');
  params.set('text', `Rutina FisioMirror - ${patientName}`);
  params.set('details', `Ejercicios: ${exerciseSummary}\n\nRealiza cada ejercicio con la técnica mostrada en la app. Sigue las indicaciones de tu fisioterapeuta.`);
  params.set('location', 'FisioMirror (App)');

  const start = new Date(baseDate);
  const end = new Date(start.getTime() + 30 * 60 * 1000);
  params.set('dates', `${formatDate(start)}/${formatDate(end)}`);

  const daysArray = dayOffsets.map((offset) => DAY_MAP[(1 + offset) % 7]).filter((v, i, a) => a.indexOf(v) === i);
  if (daysArray.length > 0) {
    const byDay = daysArray.map((d) => ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'][d]).join(',');
    params.set('recur', `RRULE:FREQ=WEEKLY;BYDAY=${byDay}`);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function buildIcsFileContent(exercises: CalendarExercise[], patientName: string): string {
  if (exercises.length === 0) return '';

  const freq = exercises[0].frecuencia_semana || 3;
  const daysPerWeek = Math.min(freq, 7);
  const baseDate = getNextWeekday(1);

  const exerciseSummary = exercises.map((ex) =>
    `${ex.nombre} (${ex.series ?? 3}x${ex.repeticiones ?? 10})`,
  ).join(', ');

  const start = baseDate;
  const end = new Date(start.getTime() + 30 * 60 * 1000);

  const fmtIcs = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const daysArray = Array.from({ length: daysPerWeek }, (_, i) => Math.floor((i * 7) / daysPerWeek));
  const byDay = daysArray.map((offset) => {
    const dayNum = (1 + offset) % 7;
    return ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'][dayNum];
  }).filter((v, i, a) => a.indexOf(v) === i);

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//FisioMirror//Tele-rehabilitacion//ES',
    'BEGIN:VEVENT',
    `UID:${Date.now()}@fisiomirror.app`,
    `DTSTAMP:${fmtIcs(new Date())}`,
    `DTSTART:${fmtIcs(start)}`,
    `DTEND:${fmtIcs(end)}`,
    `SUMMARY:Rutina FisioMirror - ${patientName}`,
    `DESCRIPTION:Ejercicios: ${exerciseSummary}`,
    'LOCATION:FisioMirror (App)',
    `RRULE:FREQ=WEEKLY;BYDAY=${byDay.join(',')}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return lines.join('\r\n');
}
