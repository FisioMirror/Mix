import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DAYS = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'];

interface SimpleCalendarProps {
  onSelectDate?: (date: Date) => void;
  markedDates?: Date[];
  className?: string;
}

export function SimpleCalendar({ onSelectDate, markedDates = [], className }: SimpleCalendarProps) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selected, setSelected] = useState<Date | null>(null);

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();
  const leading = firstDay === 0 ? 6 : firstDay - 1;

  const handleDateClick = (day: number) => {
    const date = new Date(currentYear, currentMonth, day);
    setSelected(date);
    onSelectDate?.(date);
  };

  const isToday = (day: number) =>
    today.getDate() === day && today.getMonth() === currentMonth && today.getFullYear() === currentYear;

  const isMarked = (day: number) =>
    markedDates.some((d) => d.getDate() === day && d.getMonth() === currentMonth && d.getFullYear() === currentYear);

  const cells: React.ReactNode[] = [];
  for (let i = leading; i > 0; i--) {
    cells.push(
      <div key={`prev-${i}`} className="text-on-surface-variant/30 text-sm py-1">
        {prevMonthDays - i + 1}
      </div>,
    );
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(
      <button
        key={day}
        onClick={() => handleDateClick(day)}
        className={cn(
          'text-sm py-1 rounded-full w-8 h-8 flex items-center justify-center transition-colors',
          isToday(day) && 'bg-primary text-on-primary',
          !isToday(day) && selected?.getDate() === day && selected?.getMonth() === currentMonth && 'ring-2 ring-primary/40',
          isMarked(day) && 'relative after:absolute after:bottom-0.5 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:bg-primary after:rounded-full',
          !isToday(day) && 'hover:bg-primary/10 text-on-surface',
        )}
      >
        {day}
      </button>,
    );
  }

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); }
    else setCurrentMonth(currentMonth - 1);
  };
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); }
    else setCurrentMonth(currentMonth + 1);
  };

  return (
    <div className={cn('glass-card p-4 w-full max-w-sm', className)}>
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} aria-label="Mes anterior" className="p-1 rounded-lg hover:bg-primary/10 transition-colors text-on-surface-variant">
          <ChevronLeft size={18} />
        </button>
        <h3 className="font-title-md text-title-md text-on-surface">{MONTHS[currentMonth]} {currentYear}</h3>
        <button onClick={nextMonth} aria-label="Mes siguiente" className="p-1 rounded-lg hover:bg-primary/10 transition-colors text-on-surface-variant">
          <ChevronRight size={18} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-on-surface-variant text-xs font-medium mb-2">
        {DAYS.map((d) => <div key={d}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">{cells}</div>
    </div>
  );
}
