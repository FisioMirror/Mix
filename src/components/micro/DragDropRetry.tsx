import { useState } from 'react';

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

const DragDropRetry = () => {
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [isDragOver, setIsDragOver] = useState(false);

  const simulateUpload = () => {
    if (status === 'success' || status === 'uploading') return;
    setStatus('uploading');
    setTimeout(() => setStatus(Math.random() > 0.4 ? 'success' : 'error'), 1500);
  };

  return (
    <div className={`border-2 border-dashed border-teal-500 rounded-3xl p-12 text-center cursor-pointer transition-all ${isDragOver ? 'bg-teal-50 dark:bg-teal-900/20' : 'bg-slate-50 dark:bg-slate-800'} ${status === 'uploading' ? 'opacity-60 pointer-events-none' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }} onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setIsDragOver(false); simulateUpload(); }} onClick={simulateUpload}>
      <p className="text-lg text-slate-700 dark:text-slate-200">📁 Arrastra un archivo o haz clic</p>
      <div className="mt-4 text-sm text-slate-500 dark:text-slate-400">
        {status === 'idle' && 'Esperando archivo...'}
        {status === 'uploading' && '⏳ Subiendo...'}
        {status === 'success' && '✅ Archivo subido correctamente'}
        {status === 'error' && '❌ Error en la subida. Reintenta.'}
      </div>
      {status === 'error' && (
        <button className="mt-4 px-6 py-2 bg-teal-500 text-white rounded-full font-semibold" onClick={(e) => { e.stopPropagation(); setStatus('idle'); setTimeout(simulateUpload, 300); }}>🔄 Reintentar</button>
      )}
    </div>
  );
};
export default DragDropRetry;
