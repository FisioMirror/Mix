import { useState } from 'react';

type ItemState = 'exists' | 'deleting' | 'gone';

const DeleteAnimation = () => {
  const [itemState, setItemState] = useState<ItemState>('exists');
  const handleToggle = () => {
    if (itemState === 'gone') setItemState('exists');
    else if (itemState === 'exists') { setItemState('deleting'); setTimeout(() => setItemState('gone'), 500); }
  };
  return (
    <div className="flex justify-between items-center gap-4">
      {itemState !== 'gone' && (
        <span className={`bg-slate-100 dark:bg-slate-700 px-6 py-3 rounded-full border transition-all duration-500 ${itemState === 'deleting' ? 'scale-20 rotate-120 opacity-0' : ''}`}>📄 Documento_importante.pdf</span>
      )}
      <button className="px-5 py-2 border border-slate-300 dark:border-slate-600 text-red-500 rounded-full font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 transition" onClick={handleToggle}>
        {itemState === 'exists' && '🗑️ Eliminar'}
        {itemState === 'deleting' && '↩️ Deshacer'}
        {itemState === 'gone' && '🔄 Restaurar'}
      </button>
    </div>
  );
};
export default DeleteAnimation;
