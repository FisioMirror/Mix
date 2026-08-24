import { useState } from 'react';

const EyesLookAway = () => {
  const [hasText, setHasText] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const lookAway = hasText || isFocused;
  return (
    <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-700 px-5 py-3 rounded-full border border-slate-200 dark:border-slate-600">
      <span className={`text-3xl transition-transform duration-300 ${lookAway ? 'translate-x-3 -translate-y-2 rotate-12 scale-75' : ''}`}>👀</span>
      <input type="password" className="bg-transparent border-none py-2 text-lg text-slate-900 dark:text-white outline-none w-full" placeholder="Escribe tu contraseña..."
        onChange={(e) => setHasText(e.target.value.length > 0)} onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)} />
    </div>
  );
};
export default EyesLookAway;
