import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "../../lib/utils";

interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  label?: string;
  maxDisplay?: number;
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Selecciona...",
  label,
  maxDisplay = 3,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (val: string) => {
    if (value.includes(val)) {
      onChange(value.filter((v) => v !== val));
    } else {
      onChange([...value, val]);
    }
  };

  const remove = (val: string) => {
    onChange(value.filter((v) => v !== val));
  };

  const selectedLabels = options
    .filter((o) => value.includes(o.value))
    .map((o) => o.label);

  return (
    <div ref={ref} className="relative">
      {label && (
        <label className="block text-sm font-medium text-primary-800 mb-1.5">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "w-full min-h-[44px] px-3 py-2 rounded-xl border bg-white text-left flex items-center justify-between gap-2 transition-all",
          open
            ? "border-accent ring-2 ring-accent/20"
            : "border-primary-200 hover:border-primary-300",
        )}
      >
        <div className="flex flex-wrap gap-1.5 flex-1">
          {selectedLabels.length === 0 ? (
            <span className="text-primary-400 text-sm">{placeholder}</span>
          ) : (
            selectedLabels.slice(0, maxDisplay).map((lbl) => (
              <span
                key={lbl}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-accent/10 text-accent text-xs font-medium"
              >
                {lbl}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(options.find((o) => o.label === lbl)?.value ?? "");
                  }}
                  className="hover:bg-accent/20 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))
          )}
          {selectedLabels.length > maxDisplay && (
            <span className="px-2 py-0.5 rounded-lg bg-primary-100 text-primary-600 text-xs font-medium">
              +{selectedLabels.length - maxDisplay}
            </span>
          )}
        </div>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-primary-400 transition-transform flex-shrink-0",
            open && "rotate-180",
          )}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-1 w-full rounded-xl border border-primary-100 bg-white shadow-glass-lg max-h-56 overflow-y-auto"
          >
            {options.map((opt) => {
              const selected = value.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggle(opt.value)}
                  className={cn(
                    "w-full px-3 py-2.5 flex items-center gap-2.5 text-left text-sm transition-colors",
                    selected
                      ? "bg-accent/10 text-accent"
                      : "text-primary-700 hover:bg-primary-50",
                  )}
                >
                  <span
                    className={cn(
                      "w-4 h-4 rounded-md border flex items-center justify-center flex-shrink-0 transition-all",
                      selected
                        ? "bg-accent border-accent"
                        : "border-primary-300",
                    )}
                  >
                    {selected && <Check className="w-3 h-3 text-white" />}
                  </span>
                  {opt.label}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
