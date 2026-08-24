import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from './Icon';
import { Spinner } from './Loader';
import { useToast } from './ToastProvider';
import { supabase } from '../../lib/supabase';
import { exportSimplePDF, exportPremiumPDF, type PDFPatientData } from '../../lib/pdfExport';

interface PDFModalProps {
  open: boolean;
  onClose: () => void;
  data: PDFPatientData;
  filename: string;
}

export function PDFExportModal({ open, onClose, data, filename }: PDFModalProps) {
  const toast = useToast();
  const [mode, setMode] = useState<'choice' | 'simple' | 'ai'>('choice');
  const [loading, setLoading] = useState(false);

  const handleSimple = () => {
    setLoading(true);
    try {
      exportSimplePDF(data, filename);
      toast.success('PDF generado correctamente');
      onClose();
    } catch {
      toast.error('Error generando PDF');
    } finally {
      setLoading(false);
      setMode('choice');
    }
  };

  const handleAI = async () => {
    setLoading(true);
    try {
      const { data: jobRow } = await supabase.from('ai_jobs').insert({
        type: 'pdf_report',
        status: 'pending',
        input_data: { data },
      }).select('id').single();

      if (!jobRow) {
        toast.error('Error creando job de IA');
        setLoading(false);
        return;
      }

      const jobId = jobRow.id;
      let attempts = 0;
      let aiNarrative: string | null = null;

      while (attempts < 30) {
        await new Promise((r) => setTimeout(r, 2000));
        const { data: job } = await supabase.from('ai_jobs').select('status, result').eq('id', jobId).single();
        if (job?.status === 'completed' && job.result) {
          aiNarrative = job.result as string;
          break;
        }
        if (job?.status === 'failed') break;
        attempts++;
      }

      if (aiNarrative) {
        await exportPremiumPDF(data, filename, aiNarrative);
        toast.success('PDF estilizado generado correctamente');
        onClose();
      } else {
        toast.error('La IA tardó demasiado. Intenta la opción rápida.');
      }
    } catch {
      toast.error('Error generando PDF con IA');
    } finally {
      setLoading(false);
      setMode('choice');
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="glass-panel rounded-3xl p-8 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-headline-lg text-headline-lg text-on-surface">Exportar Reporte</h3>
              <button onClick={onClose} aria-label="Cerrar ventana de exportación" className="text-outline hover:text-error"><Icon name="close" size={24} /></button>
            </div>

            {mode === 'choice' && (
              <div className="space-y-4">
                <button
                  onClick={() => setMode('simple')}
                  disabled={loading}
                  className="w-full p-5 rounded-2xl border-2 border-primary/20 hover:border-primary hover:bg-primary/5 transition-all text-left flex items-center gap-4"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Icon name="description" size={24} />
                  </div>
                  <div>
                    <p className="font-bold text-on-surface">PDF Rápido</p>
                    <p className="text-sm text-on-surface-variant">Reporte clínico limpio con jspdf. Generación instantánea.</p>
                  </div>
                </button>
                <button
                  onClick={() => setMode('ai')}
                  disabled={loading}
                  className="w-full p-5 rounded-2xl border-2 border-tertiary/20 hover:border-tertiary hover:bg-tertiary/5 transition-all text-left flex items-center gap-4"
                >
                  <div className="w-12 h-12 rounded-xl bg-tertiary/10 flex items-center justify-center text-tertiary shrink-0">
                    <Icon name="auto_awesome" size={24} />
                  </div>
                  <div>
                    <p className="font-bold text-on-surface">PDF Estilizado con IA</p>
                    <p className="text-sm text-on-surface-variant">Diseño profesional generado por IA. Toma unos segundos.</p>
                  </div>
                </button>
              </div>
            )}

            {mode === 'simple' && (
              <div className="space-y-4">
                <div className="text-center py-4">
                  <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Icon name="description" filled size={28} className="text-primary" />
                  </div>
                  <p className="font-bold text-on-surface">PDF Rápido</p>
                  <p className="text-sm text-on-surface-variant mt-1">Se generará un reporte clínico con datos del paciente y tabla de sesiones.</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setMode('choice')} className="flex-1 py-3 rounded-xl bg-surface-variant/40 text-on-surface-variant font-bold hover:bg-surface-variant/60 transition-all">Atrás</button>
                  <button onClick={handleSimple} disabled={loading} className="flex-1 py-3 rounded-xl bg-primary text-on-primary font-bold hover:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                    {loading ? <Spinner size={18} className="text-current" /> : <Icon name="download" size={18} />}
                    Generar
                  </button>
                </div>
              </div>
            )}

            {mode === 'ai' && (
              <div className="space-y-4">
                <div className="text-center py-4">
                  <div className="w-14 h-14 bg-tertiary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Icon name="auto_awesome" filled size={28} className="text-tertiary" />
                  </div>
                  <p className="font-bold text-on-surface">PDF Estilizado con IA</p>
                  <p className="text-sm text-on-surface-variant mt-1">La IA generará un diseño profesional del reporte. Esto puede tomar unos segundos.</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setMode('choice')} className="flex-1 py-3 rounded-xl bg-surface-variant/40 text-on-surface-variant font-bold hover:bg-surface-variant/60 transition-all">Atrás</button>
                  <button onClick={handleAI} disabled={loading} className="flex-1 py-3 rounded-xl bg-tertiary text-white font-bold hover:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                    {loading ? <Spinner size={18} className="text-current" /> : <Icon name="auto_awesome" size={18} />}
                    {loading ? 'Generando...' : 'Generar con IA'}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
