import { useState, useRef, useEffect } from 'react';

const OtpFold = () => {
  const [values, setValues] = useState(['', '', '', '']);
  const [isFolded, setIsFolded] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newValues = [...values];
    newValues[index] = value.replace(/\D/g, '');
    setValues(newValues);
    if (value && index < 3) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !values[index] && index > 0) inputRefs.current[index - 1]?.focus();
  };

  useEffect(() => {
    setIsFolded(values.every(v => v.length === 1));
  }, [values]);

  const resetOtp = () => {
    setValues(['', '', '', '']);
    setIsFolded(false);
    inputRefs.current[0]?.focus();
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-3 justify-center items-center">
        {values.map((val, idx) => (
          <input key={idx} ref={(el) => (inputRefs.current[idx] = el)} type="text" maxLength={1}
            className={`w-14 h-16 text-center text-2xl bg-slate-100 dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white outline-none focus:border-teal-500 transition-all duration-300 ${isFolded ? 'scale-0 opacity-0 w-0' : ''}`}
            value={val} onChange={(e) => handleChange(idx, e.target.value)} onKeyDown={(e) => handleKeyDown(idx, e)} disabled={isFolded} />
        ))}
        <div className={`${isFolded ? 'flex' : 'hidden'} w-14 h-16 bg-teal-500 text-white rounded-xl items-center justify-center text-3xl cursor-pointer`} onClick={resetOtp}>✓</div>
      </div>
      <p className="text-sm text-slate-500">Escribe el código de 4 dígitos</p>
    </div>
  );
};
export default OtpFold;
