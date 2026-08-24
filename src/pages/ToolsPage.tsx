import { useState, useRef, useEffect } from 'react';
import { Icon } from '../components/ui/Icon';
import { GlassPanel } from '../components/ui/Glass';
import { useToast } from '../components/ui/ToastProvider';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';
import { runAIJob, fileToBase64 } from '../lib/ai';
import { exportSimplePDF, exportPremiumPDF, type PDFPatientData } from '../lib/pdfExport';
import { formatAIReport } from '../lib/formatReport';
import { Spinner } from '../components/ui/Loader';
import { LoadingText } from '../components/ui/LoadingText';
import { SkeletonCard, SkeletonList } from '../components/ui/Skeleton';
import { AnimatedTabs } from '../components/ui/AnimatedTabs';
import { MedicalIcon } from '../components/ui/MedicalIcon';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

interface PatientOption {
  id: string;
  full_name: string;
  diagnostico: string | null;
}

export function ToolsPage() {
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const [bmi, setBmi] = useState(23.5);
  const [bmiStatus, setBmiStatus] = useState('Peso Saludable');
  const [height, setHeight] = useState(175);
  const [weight, setWeight] = useState(72);
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'assistant', text: 'Hola. Soy Physi, tu asistente clínico. ¿En qué puedo ayudarte?' },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [scanProcessing, setScanProcessing] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [scanResult, setScanResult] = useState<Record<string, unknown> | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryText, setSummaryText] = useState('');
  const [patientSummaryLoading, setPatientSummaryLoading] = useState(false);
  const [patientSummaryText, setPatientSummaryText] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [pdfMode, setPdfMode] = useState<'simple' | 'ai'>('simple');
  const [showUpdatePatientModal, setShowUpdatePatientModal] = useState(false);
  const [updatePatientId, setUpdatePatientId] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updatePreview, setUpdatePreview] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scanFileRef = useRef<File | null>(null);

  useEffect(() => {
    const h = height / 100;
    const result = weight / (h * h);
    setBmi(parseFloat(result.toFixed(1)));
    if (result < 18.5) setBmiStatus('Bajo Peso');
    else if (result < 25) setBmiStatus('Peso Saludable');
    else if (result < 30) setBmiStatus('Sobrepeso');
    else setBmiStatus('Obesidad');
  }, [height, weight]);

  useEffect(() => {
    loadPatients();
    loadChatHistory();
  }, [user?.id]);

  const loadPatients = async () => {
    if (!user?.id) return;
    try {
      const { data } = await supabase
        .from('pacientes_terapeutas')
        .select('paciente_id')
        .eq('terapeuta_id', user.id);
      if (data && data.length > 0) {
        const ids = data.map((d) => d.paciente_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, diagnostico')
          .in('id', ids)
          .order('full_name', { ascending: true });
        if (profiles) setPatients(profiles as unknown as PatientOption[]);
      }
    } catch {
      // silently fail — patient list stays empty
    }
  };

  const loadChatHistory = async () => {
    if (!user?.id) return;
    try {
      const { data } = await supabase
        .from('ai_conversations')
        .select('role, content')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(20);
      if (data && data.length > 0) {
        setChatMessages(data.map((d) => ({
          role: d.role as 'user' | 'assistant',
          text: d.content,
        })));
      }
    } catch {
      // keep default message
    }
  };

  const handleScan = async () => {
    if (scanProcessing) return;
    setScanProcessing(true);
    setScanComplete(false);
    setScanResult(null);

    try {
      let imageBase64 = '';
      let imageMimeType = 'image/jpeg';
      if (scanFileRef.current) {
        const imageData = await fileToBase64(scanFileRef.current);
        imageBase64 = imageData.base64;
        imageMimeType = imageData.mimeType;
      }

      const result = await runAIJob('image_analysis', {
        imageBase64,
        mimeType: imageMimeType,
        prompt: `Analiza este documento clínico y extrae TODOS los datos visibles del paciente en formato JSON con exactamente estas claves:
{
  "nombre_completo": "",
  "documento_identidad": "",
  "fecha_nacimiento": "",
  "telefono": "",
  "tipo_sangre": "",
  "ocupacion": "",
  "nivel_actividad": "",
  "es_menor_edad": false,
  "patologia": "",
  "diagnostico_secundario": "",
  "medicamentos_actuales": "",
  "alergias": "",
  "enfermedades_cronicas": "",
  "lesiones_previas": "",
  "estatura_cm": "",
  "peso_kg": "",
  "extremidad_afectada": "",
  "rom_objetivo": "",
  "frecuencia_sesiones": "",
  "medico_remitente": "",
  "contacto_emergencia_nombre": "",
  "contacto_emergencia_telefono": ""
}
Si un campo no es visible en el documento, déjalo como string vacío. Responde SOLO con el JSON, sin markdown ni texto adicional.`,
      });

      if (result.success && result.result) {
        try {
          const cleaned = result.result
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();
          const parsed = JSON.parse(cleaned);
          setScanResult(parsed);
        } catch {
          setScanResult({ contenido: result.result });
        }
        setScanComplete(true);
        toast.success('Análisis completado');
      } else {
        toast.error(result.error || 'Error en el análisis');
      }
    } catch {
      toast.error('Error procesando el documento');
    } finally {
      setScanProcessing(false);
    }
  };

  const sendChat = async () => {
    if (!chatInput.trim() || aiLoading) return;
    const userMsg = chatInput;
    setChatMessages([...chatMessages, { role: 'user', text: userMsg }]);
    setChatInput('');
    setAiLoading(true);

    try {
      if (user?.id) {
        await supabase.from('ai_conversations').insert({
          user_id: user.id,
          role: 'user',
          content: userMsg,
        });
      }

      const result = await runAIJob('text_generation', {
        userPrompt: userMsg,
      });

      let text = result.success && result.result ? result.result : 'Lo siento, hubo un error procesando tu consulta.';
      try {
        const parsed = JSON.parse(text);
        if (parsed.hallazgos || parsed.recomendaciones) {
          text = `${parsed.hallazgos || ''}\n\n${parsed.recomendaciones || ''}`;
        }
      } catch { /* not JSON */ }

      setChatMessages((prev) => [...prev, { role: 'assistant', text }]);

      if (user?.id) {
        await supabase.from('ai_conversations').insert({
          user_id: user.id,
          role: 'assistant',
          content: text,
        });
      }
    } catch {
      setChatMessages((prev) => [...prev, { role: 'assistant', text: 'Error de conexión con Physi. Intenta de nuevo en unos momentos.' }]);
    } finally {
      setAiLoading(false);
    }
  };

  const generateSessionSummary = async () => {
    if (!selectedPatient) {
      toast.error('Selecciona un paciente');
      return;
    }
    setSummaryLoading(true);
    setSummaryText('');

    try {
      const { data: sessions } = await supabase
        .from('sesiones_completadas')
        .select('fecha, duracion_segundos, repeticiones, calidad_ejecucion')
        .eq('paciente_id', selectedPatient)
        .order('fecha', { ascending: false })
        .limit(5);

      const { data: patientProfile } = await supabase
        .from('profiles')
        .select('full_name, diagnostico')
        .eq('id', selectedPatient)
        .maybeSingle();

      const sessionData = {
        patientName: patientProfile?.full_name || 'Paciente',
        diagnosis: patientProfile?.diagnostico || 'No especificado',
        sessions: sessions || [],
      };

      const result = await runAIJob('summaries', {
        userPrompt: `Genera un resumen clínico de la sesión de rehabilitación con los siguientes datos reales del paciente: ${JSON.stringify(sessionData)}`,
      });

      if (result.success && result.result) {
        setSummaryText(result.result);
        toast.success('Resumen generado');
      } else {
        toast.error(result.error || 'Error generando resumen');
      }
    } catch {
      toast.error('Error generando resumen');
    } finally {
      setSummaryLoading(false);
    }
  };

  const generatePatientSummary = async () => {
    setPatientSummaryLoading(true);
    setPatientSummaryText('');

    try {
      const { data: links } = await supabase
        .from('pacientes_terapeutas')
        .select('paciente_id')
        .eq('terapeuta_id', user?.id);

      const patientIds = (links || []).map((l) => l.paciente_id);
      let summaryContext = 'No hay pacientes activos.';

      if (patientIds.length > 0) {
        const { data: patientProfiles } = await supabase
          .from('profiles')
          .select('id, full_name, diagnostico')
          .in('id', patientIds);

        const { data: allSessions } = await supabase
          .from('sesiones_completadas')
          .select('paciente_id, fecha, duracion_segundos, repeticiones, calidad_ejecucion')
          .in('paciente_id', patientIds)
          .order('fecha', { ascending: false })
          .limit(30);

        summaryContext = JSON.stringify({
          patients: patientProfiles || [],
          recentSessions: allSessions || [],
        });
      }

      const result = await runAIJob('summaries', {
        userPrompt: `Genera un resumen general del progreso de todos los pacientes activos basado en los siguientes datos reales: ${summaryContext}`,
      });

      if (result.success && result.result) {
        setPatientSummaryText(result.result);
        toast.success('Resumen generado');
      } else {
        toast.error(result.error || 'Error generando resumen');
      }
    } catch {
      toast.error('Error generando resumen');
    } finally {
      setPatientSummaryLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (!selectedPatient) {
      toast.error('Selecciona un paciente primero');
      return;
    }
    setPdfLoading(true);
    try {
      const { data: patientProfile } = await supabase
        .from('profiles')
        .select('full_name, diagnostico')
        .eq('id', selectedPatient)
        .maybeSingle();

      const { data: sessions } = await supabase
        .from('sesiones_completadas')
        .select('fecha, ejercicio_nombre, duracion_segundos, repeticiones, calidad_ejecucion')
        .eq('paciente_id', selectedPatient)
        .order('fecha', { ascending: false })
        .limit(20);

      const { data: allSessions } = await supabase
        .from('sesiones_completadas')
        .select('calidad_ejecucion')
        .eq('paciente_id', selectedPatient);

      const totalSessions = allSessions?.length || 0;
      const avgQuality = allSessions && allSessions.length > 0
        ? allSessions.reduce((sum, s) => sum + (s.calidad_ejecucion || 0), 0) / allSessions.length
        : 0;

      const pdfData: PDFPatientData = {
        patientName: patientProfile?.full_name || 'Paciente',
        diagnosis: patientProfile?.diagnostico,
        sessions: (sessions || []).map((s) => ({
          fecha: s.fecha,
          ejercicio: s.ejercicio_nombre || 'Ejercicio',
          duracion_segundos: s.duracion_segundos || 0,
          repeticiones: s.repeticiones || 0,
          calidad_ejecucion: s.calidad_ejecucion || 0,
        })),
        globalMetrics: {
          totalSessions,
          avgQuality,
        },
      };

      if (pdfMode === 'simple') {
        exportSimplePDF(pdfData, `FisioMirror_${pdfData.patientName}.pdf`);
        toast.success('PDF descargado correctamente');
      } else {
        const result = await runAIJob('pdf_report', {
          data: {
            patientName: pdfData.patientName,
            diagnosis: pdfData.diagnosis || 'No especificado',
            sessions: pdfData.sessions,
            globalMetrics: pdfData.globalMetrics,
          },
        });

        if (result.success && result.result) {
          await exportPremiumPDF(pdfData, `FisioMirror_IA_${pdfData.patientName}.pdf`, result.result);
          toast.success('PDF con IA descargado correctamente');
        } else {
          toast.error(result.error || 'Error generando PDF con IA');
        }
      }
    } catch {
      toast.error('Error al exportar el PDF');
    } finally {
      setPdfLoading(false);
      setPdfModalOpen(false);
    }
  };

  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      scanFileRef.current = file;
      handleScan();
    }
  };

  const toolsGrid = (filter: 'todas' | 'ia' | 'ocr') => {
    const isIA = (id: string) => id === 'ocr' || id === 'summary' || id === 'patient-summary' || id === 'pdf-ai' || id === 'chat' || id === 'bmi';
    const isOCR = (id: string) => id === 'ocr';
    const showTool = (id: string) => filter === 'todas' || (filter === 'ia' && isIA(id)) || (filter === 'ocr' && isOCR(id));

    return (
    <>
            {showTool('ocr') && (
            <GlassPanel className="md:col-span-2 lg:col-span-3 p-6 sm:p-8 rounded-3xl relative overflow-hidden card-glow-hover vibrant-hover border-l-4 border-l-teal-400/60 dark:border-l-teal-600/40 shadow-teal-100/50 dark:shadow-none w-full">
            <div className="blob-teal absolute -top-12 -right-12 w-40 h-40 opacity-30 pointer-events-none" />
            <div className="flex justify-between items-start mb-6 relative">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><MedicalIcon name="clipboard" size={24} className="text-primary animate-breathe-icon" /></div>
                <div>
                  <h3 className="font-title-md text-title-md gradient-text-teal">OCR Clínico Rápido</h3>
                  <p className="text-sm text-on-surface-variant">Convierte recetas e informes en datos estructurados</p>
                </div>
              </div>
              <span className="bg-primary/10 text-primary text-[10px] uppercase font-bold px-3 py-1 rounded-full tracking-wider">IA</span>
            </div>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative border-2 border-dashed border-outline-variant rounded-2xl p-8 sm:p-12 flex flex-col items-center text-center gap-4 bg-white/10 dark:bg-white/5 hover:bg-white/30 dark:hover:bg-white/10 hover:border-primary/50 transition-all cursor-pointer overflow-hidden group"
            >
              <div className="absolute inset-0 shimmer-wave opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              <div className="relative z-10 flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-primary-container/10 rounded-full flex items-center justify-center">
                {scanProcessing ? <Spinner size={32} className="text-primary" /> : scanComplete ? <Icon name="check_circle" filled size={32} className="text-primary animate-breathe-icon" /> : <Icon name="upload_file" size={32} className="text-primary" />}
              </div>
              <p className="font-title-md text-title-md text-on-surface">{scanProcessing ? <LoadingText context="ocr" /> : scanComplete ? 'Análisis Completado' : 'Arrastra o selecciona un documento clínico'}</p>
              <p className="text-sm text-on-surface-variant">Soporta PDF, JPG, PNG (Máx 15MB)</p>
              <button onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} className="premium-btn bg-primary text-on-primary px-6 py-3 rounded-full font-bold text-sm hover:scale-105 active:scale-95 transition-all">
                Seleccionar Archivo
              </button>
              <input ref={fileInputRef} type="file" accept=".pdf,image/*" className="hidden" onChange={onFileSelected} />
              </div>
            </div>

            {scanResult && (
              <div className="mt-4 p-4 glass-panel rounded-2xl space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-sm text-primary">Resultado del Análisis (22 Campos)</h4>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const text = Object.entries(scanResult as Record<string, unknown>)
                          .filter(([, v]) => v != null && v !== '' && v !== false)
                          .map(([k, v]) => `${k}: ${String(v)}`)
                          .join('\n');
                        try { navigator.clipboard?.writeText(text); toast.success('Texto copiado al portapapeles'); } catch { toast.error('No se pudo copiar'); }
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-600 text-white font-bold text-xs hover:bg-teal-700 transition-colors min-h-[36px]"
                    >
                      <Icon name="content_copy" size={16} /> Copiar texto
                    </button>
                    <button
                      onClick={() => { setShowUpdatePatientModal(true); setUpdatePreview({}); setUpdatePatientId(''); }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-600 text-white font-bold text-xs hover:bg-teal-800 transition-colors min-h-[36px] shadow-md"
                    >
                      <Icon name="person_update" size={16} /> Actualizar paciente
                    </button>
                  </div>
                </div>
                {(() => {
                  const r = scanResult as Record<string, unknown>;
                  const fields: { key: string; label: string }[] = [
                    { key: 'nombre_completo', label: 'Nombre Completo' },
                    { key: 'documento_identidad', label: 'Documento' },
                    { key: 'fecha_nacimiento', label: 'Fecha Nacimiento' },
                    { key: 'telefono', label: 'Teléfono' },
                    { key: 'tipo_sangre', label: 'Tipo Sangre' },
                    { key: 'ocupacion', label: 'Ocupación' },
                    { key: 'nivel_actividad', label: 'Nivel Actividad' },
                    { key: 'es_menor_edad', label: 'Menor de Edad' },
                    { key: 'patologia', label: 'Patología' },
                    { key: 'diagnostico_secundario', label: 'Diagnóstico Secundario' },
                    { key: 'medicamentos_actuales', label: 'Medicamentos' },
                    { key: 'alergias', label: 'Alergias' },
                    { key: 'enfermedades_cronicas', label: 'Enf. Crónicas' },
                    { key: 'lesiones_previas', label: 'Lesiones Previas' },
                    { key: 'estatura_cm', label: 'Estatura (cm)' },
                    { key: 'peso_kg', label: 'Peso (kg)' },
                    { key: 'extremidad_afectada', label: 'Extremidad Afectada' },
                    { key: 'rom_objetivo', label: 'ROM Objetivo' },
                    { key: 'frecuencia_sesiones', label: 'Frecuencia Sesiones' },
                    { key: 'medico_remitente', label: 'Médico Tratante' },
                    { key: 'contacto_emergencia_nombre', label: 'Contacto Emergencia' },
                    { key: 'contacto_emergencia_telefono', label: 'Tel. Emergencia' },
                  ];
                  const hasStructured = fields.some(f => r[f.key] != null && r[f.key] !== '');
                  if (hasStructured) {
                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {fields.map(f => {
                          const val = r[f.key];
                          if (val == null || val === '' || val === false) return null;
                          return (
                            <div key={f.key} className="flex items-start gap-2 p-2 rounded-lg bg-primary/5">
                              <span className="text-[10px] font-bold text-on-surface-variant uppercase whitespace-nowrap min-w-[80px]">{f.label}</span>
                              <span className="text-sm font-bold text-on-surface break-words">{String(val)}</span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  }
                  return Object.entries(r).map(([k, v]) => (
                    <p key={k} className="text-sm"><span className="text-on-surface-variant capitalize">{k}: </span><span className="font-bold">{String(v)}</span></p>
                  ));
                })()}
              </div>
            )}
          </GlassPanel>
          )}

          {/* BMI Calculator */}
          {showTool('bmi') && (
          <GlassPanel className="md:col-span-2 lg:col-span-1 p-6 sm:p-8 rounded-3xl flex flex-col card-glow-hover relative overflow-hidden vibrant-hover w-full border-l-4 border-l-teal-400/60 dark:border-l-teal-600/40 shadow-teal-100/50 dark:shadow-none">
            <div className="blob-warm absolute -top-12 -right-12 w-32 h-32 opacity-30 pointer-events-none" />
            <div className="flex items-center gap-3 mb-6 relative">
              <div className="w-12 h-12 rounded-xl bg-tertiary/10 flex items-center justify-center"><Icon name="calculate" size={24} className="text-tertiary animate-breathe-icon" /></div>
              <div>
                <h3 className="font-title-md text-title-md gradient-text-editorial">Calculadora IMC</h3>
                <p className="text-sm text-on-surface-variant">Clasificación clínica en tiempo real</p>
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between mb-2"><label className="text-sm font-bold text-on-surface">Altura</label><span className="text-primary font-bold">{height} cm</span></div>
                <input type="range" min={100} max={250} value={height} onChange={(e) => setHeight(parseInt(e.target.value))} className="w-full h-2 bg-secondary-container rounded-full appearance-none cursor-pointer accent-primary" />
              </div>
              <div>
                <div className="flex justify-between mb-2"><label className="text-sm font-bold text-on-surface">Peso</label><span className="text-primary font-bold">{weight} kg</span></div>
                <input type="range" min={30} max={200} value={weight} onChange={(e) => setWeight(parseInt(e.target.value))} className="w-full h-2 bg-secondary-container rounded-full appearance-none cursor-pointer accent-primary" />
              </div>
            </div>
            <div className="mt-8 p-6 bg-primary-container text-on-primary-container rounded-2xl shadow-xl">
              <p className="text-sm opacity-80">IMC Calculado</p>
              <span className="text-4xl font-extrabold">{bmi}</span>
              <div className="mt-2 flex items-center gap-3 flex-wrap">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${bmiStatus === 'Peso Saludable' ? 'bg-emerald-500 text-white' : bmiStatus === 'Bajo Peso' ? 'bg-amber-500 text-white' : bmiStatus === 'Sobrepeso' ? 'bg-orange-500 text-white' : 'bg-red-500 text-white'}`}>{bmiStatus}</span>
                <p className="text-xs opacity-60">Rango Normal: 18.5 – 24.9</p>
              </div>
              <div className="mt-4 flex h-2 rounded-full overflow-hidden">
                <div className="flex-1 bg-amber-500" style={{ flexGrow: bmi < 18.5 ? 2 : 1 }} />
                <div className="flex-1 bg-emerald-500" style={{ flexGrow: bmi >= 18.5 && bmi < 25 ? 2 : 1 }} />
                <div className="flex-1 bg-orange-500" style={{ flexGrow: bmi >= 25 && bmi < 30 ? 2 : 1 }} />
                <div className="flex-1 bg-red-500" style={{ flexGrow: bmi >= 30 ? 2 : 1 }} />
              </div>
              <div className="flex justify-between text-[10px] mt-1 opacity-60">
                <span>18.5</span><span>25</span><span>30</span><span>+</span>
              </div>
            </div>
          </GlassPanel>
          )}

          {/* Session Summary */}
          {showTool('summary') && (
          <GlassPanel className="md:col-span-2 lg:col-span-3 p-6 sm:p-8 rounded-3xl card-glow-hover relative overflow-hidden border-l-4 border-l-teal-400/60 dark:border-l-teal-600/40 shadow-teal-100/50 dark:shadow-none w-full">
            <div className="blob-teal absolute -top-12 -left-12 w-40 h-40 opacity-25 pointer-events-none" />
            <div className="flex items-center gap-3 mb-6 relative">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Icon name="auto_awesome" size={24} className="text-primary animate-breathe-icon" /></div>
              <div>
                <h3 className="font-title-md text-title-md gradient-text-teal">Resumen de Sesión IA</h3>
                <p className="text-sm text-on-surface-variant">Genera un resumen narrativo a partir de las últimas sesiones reales</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <select value={selectedPatient} onChange={(e) => setSelectedPatient(e.target.value)} className="flex-1 px-4 py-3 rounded-xl bg-surface-variant/20 border border-outline-variant/30 outline-none focus:ring-2 focus:ring-primary/20 text-on-surface">
                <option value="">Seleccionar Paciente</option>
                {patients.length === 0 && <option value="" disabled>No hay pacientes asignados</option>}
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>{p.full_name}</option>
                ))}
              </select>
              <button onClick={generateSessionSummary} disabled={summaryLoading || !selectedPatient} className="premium-btn bg-primary text-on-primary shadow-glow-primary px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 whitespace-nowrap">
                {summaryLoading ? <Spinner size={20} className="text-on-primary" /> : <Icon name="auto_awesome" size={20} />}
                {summaryLoading ? <LoadingText context="ai" /> : 'Generar Resumen'}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="glass-panel p-4 rounded-2xl card-glow-hover">
                <div className="flex items-center gap-2 mb-3"><Icon name="sensors" size={20} className="text-primary animate-breathe-icon" /><span className="font-bold text-sm text-on-surface">Datos Reales</span></div>
                <p className="text-sm text-on-surface-variant">El resumen se genera a partir de las últimas 5 sesiones registradas del paciente seleccionado en la base de datos.</p>
              </div>
              <div className="md:col-span-2">
                <GlassPanel className="rounded-2xl overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.08)]">
                  {/* Header */}
                  <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-primary/15 via-primary/5 to-transparent border-b border-primary/15">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center ring-1 ring-primary/20">
                        <MedicalIcon name="clipboard" size={22} className="text-primary" />
                      </div>
                      <div>
                        <h4 className="font-title-md text-title-md text-primary tracking-wide">Informe de Sesión</h4>
                        <p className="text-[10px] text-on-surface-variant font-semibold uppercase tracking-wider">Resumen Clínico IA</p>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => { if (summaryText) { try { navigator.clipboard?.writeText(summaryText); toast.info('Copiado al portapapeles'); } catch { toast.error('No se pudo copiar'); } } else { toast.error('No hay resumen para copiar'); } }} className="w-8 h-8 rounded-lg flex items-center justify-center text-outline hover:text-primary hover:bg-primary/10 transition-colors"><Icon name="content_copy" size={16} /></button>
                      <button onClick={() => { try { window.print(); } catch { toast.error('No se pudo imprimir'); } }} className="w-8 h-8 rounded-lg flex items-center justify-center text-outline hover:text-primary hover:bg-primary/10 transition-colors"><Icon name="print" size={16} /></button>
                    </div>
                  </div>
                  {/* Body */}
                  <div className="px-5 py-5 min-h-[140px]">
                    {summaryText ? (
                      formatAIReport(summaryText)
                    ) : summaryLoading ? (
                      <SkeletonList count={3} />
                    ) : (
                      <div className="empty-state-premium">
                        <Icon name="auto_awesome" size={32} className="opacity-40 mb-2" />
                        <p className="italic text-sm text-on-surface-variant leading-relaxed">Aún no hay un resumen clínico. Selecciona un paciente y pulsa «Generar Resumen» para obtener un análisis narrativo de las últimas sesiones.</p>
                      </div>
                    )}
                  </div>
                  {/* Footer */}
                  {summaryText && (
                    <div className="flex items-center justify-between px-5 py-3 bg-surface-variant/10 border-t border-outline-variant/20">
                      <span className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                        <Icon name="schedule" size={12} className="opacity-60" />
                        {new Date().toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => { try { exportPremiumPDF({ patientName: 'Resumen de Sesión', sessions: [], globalMetrics: { totalSessions: 0, avgQuality: 0 } }, `FisioMirror_Informe_Sesion_${Date.now()}.pdf`, summaryText); toast.success('Descargando PDF...'); } catch { toast.error('No se pudo exportar'); } }}
                          className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-primary hover:bg-primary/10 px-2.5 py-1.5 rounded-lg transition-colors"
                        >
                          <Icon name="download" size={14} />
                          Descargar PDF
                        </button>
                        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                          <Icon name="auto_awesome" size={11} className="text-primary" />
                          Generado por IA
                        </span>
                      </div>
                    </div>
                  )}
                </GlassPanel>
              </div>
            </div>
          </GlassPanel>
          )}

          {/* Patient Summary */}
          {showTool('patient-summary') && (
          <GlassPanel className="md:col-span-2 lg:col-span-3 p-6 sm:p-8 rounded-3xl card-glow-hover relative overflow-hidden border-l-4 border-l-teal-400/60 dark:border-l-teal-600/40 shadow-teal-100/50 dark:shadow-none w-full">
            <div className="blob-blue absolute -top-12 -right-12 w-40 h-40 opacity-25 pointer-events-none" />
            <div className="flex items-center gap-3 mb-6 relative">
              <div className="w-12 h-12 rounded-xl bg-secondary-container/20 flex items-center justify-center"><Icon name="group" size={24} className="text-secondary animate-breathe-icon" /></div>
              <div>
                <h3 className="font-title-md text-title-md gradient-text-blue">Resumen de Pacientes</h3>
                <p className="text-sm text-on-surface-variant">Resumen general del progreso de todos tus pacientes activos</p>
              </div>
            </div>
            <button onClick={generatePatientSummary} disabled={patientSummaryLoading} className="premium-btn mb-4 bg-secondary text-on-secondary-container px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50">
              {patientSummaryLoading ? <Spinner size={20} className="text-on-secondary-container" /> : <Icon name="summarize" size={20} />}
              {patientSummaryLoading ? <LoadingText context="ai" /> : 'Generar Resumen General'}
            </button>
            {patientSummaryLoading && !patientSummaryText ? (
              <SkeletonCard />
            ) : patientSummaryText ? (
              <GlassPanel className="rounded-2xl overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.08)]">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-secondary/15 via-secondary/5 to-transparent border-b border-secondary/15">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-secondary/15 flex items-center justify-center ring-1 ring-secondary/20">
                      <MedicalIcon name="heart" size={22} className="text-secondary" />
                    </div>
                    <div>
                      <h4 className="font-title-md text-title-md text-secondary tracking-wide">Informe de Paciente</h4>
                      <p className="text-[10px] text-on-surface-variant font-semibold uppercase tracking-wider">Progreso General IA</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { try { navigator.clipboard?.writeText(patientSummaryText); toast.info('Copiado al portapapeles'); } catch { toast.error('No se pudo copiar'); } }}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-outline hover:text-secondary hover:bg-secondary/10 transition-colors"
                  >
                    <Icon name="content_copy" size={16} />
                  </button>
                </div>
                {/* Body */}
                <div className="px-5 py-5">
                  {formatAIReport(patientSummaryText)}
                </div>
                {/* Footer */}
                <div className="flex items-center justify-between px-5 py-3 bg-surface-variant/10 border-t border-outline-variant/20">
                  <span className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                    <Icon name="schedule" size={12} className="opacity-60" />
                    {new Date().toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                    <Icon name="auto_awesome" size={11} className="text-secondary" />
                    Generado por IA
                  </span>
                </div>
              </GlassPanel>
            ) : (
              <div className="empty-state-premium">
                <Icon name="group" size={32} className="opacity-40 mb-2" />
                <p className="italic text-sm text-on-surface-variant leading-relaxed">Todavía no se ha generado un resumen general. Pulsa «Generar Resumen General» para ver el progreso conjunto de tus pacientes activos.</p>
              </div>
            )}
          </GlassPanel>
          )}

          {/* PDF Export */}
          {showTool('pdf-ai') && (
          <GlassPanel className="md:col-span-2 lg:col-span-3 p-6 sm:p-8 rounded-3xl card-glow-hover relative overflow-hidden w-full">
            <div className="blob-warm absolute -bottom-12 -left-12 w-40 h-40 opacity-20 pointer-events-none" />
            <div className="flex items-center gap-3 mb-6 relative">
              <div className="w-12 h-12 rounded-xl bg-error/10 flex items-center justify-center"><Icon name="picture_as_pdf" size={24} className="text-error animate-breathe-icon" /></div>
              <div>
                <h3 className="font-title-md text-title-md gradient-text-editorial">Exportar Reporte PDF</h3>
                <p className="text-sm text-on-surface-variant">Genera un reporte clínico en PDF con datos reales del paciente</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <select value={selectedPatient} onChange={(e) => setSelectedPatient(e.target.value)} className="flex-1 px-4 py-3 rounded-xl bg-surface-variant/20 border border-outline-variant/30 outline-none focus:ring-2 focus:ring-primary/20 text-on-surface">
                <option value="">Seleccionar Paciente</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>{p.full_name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => { setPdfMode('simple'); setPdfModalOpen(true); }}
                disabled={!selectedPatient}
                className="premium-btn flex-1 bg-primary text-on-primary px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
              >
                <Icon name="flash_on" size={20} /> PDF Rápido
              </button>
              <button
                onClick={() => { setPdfMode('ai'); setPdfModalOpen(true); }}
                disabled={!selectedPatient}
                className="premium-btn flex-1 bg-secondary text-on-secondary shadow-glow-primary px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
              >
                <Icon name="auto_awesome" size={20} /> PDF Estilizado (IA)
              </button>
            </div>
          </GlassPanel>
          )}
    </>
  );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6 overflow-x-hidden">
      <div className="flex flex-col xl:flex-row gap-6">
        <div className="flex-1 flex flex-col gap-6 min-w-0">
          <div>
            <h1 className="font-headline-lg text-headline-lg-mobile lg:text-headline-lg gradient-text-editorial">Herramientas IA Clínicas</h1>
            <p className="text-on-surface-variant font-body-lg">Acelera tu flujo de trabajo con instrumentos clínicos de precisión potenciados por IA.</p>
          </div>

          <AnimatedTabs
            tabs={[
              { id: 'todas', label: 'Todas', content: (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                  {toolsGrid('todas')}
                </div>
              ) },
              { id: 'ia', label: 'IA Clínica', content: (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                  {toolsGrid('ia')}
                </div>
              ) },
              { id: 'ocr', label: 'OCR', content: (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                  {toolsGrid('ocr')}
                </div>
              ) },
            ]}
            defaultTab="todas"
          />
        </div>

      {/* AI Assistant sidebar */}
      <div className="hidden xl:flex flex-col w-[320px] lg:w-[380px] shrink-0 h-[calc(100vh-140px)] sticky top-[100px] glass-panel rounded-3xl overflow-hidden">
        <div className="p-6 bg-primary-container text-on-primary-container">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Icon name="smart_toy" filled size={28} className="animate-breathe-icon" />
              <div>
                <h3 className="font-bold gradient-text-teal">Physi</h3>
                <p className="text-xs opacity-80">Activo y Listo</p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1 p-6 space-y-4 overflow-y-auto">
          {chatMessages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-3 rounded-2xl text-sm shadow-lg transition-transform hover:scale-[1.01] ${msg.role === 'user' ? 'bg-gradient-to-br from-blue-100/80 to-blue-200/60 dark:from-slate-700/80 dark:to-slate-800/60 text-on-surface rounded-tr-none shadow-blue-200/40' : 'bg-gradient-to-br from-teal-100/80 to-teal-200/50 dark:from-slate-800/80 dark:to-slate-900/60 text-on-surface rounded-tl-none shadow-teal-200/40'}`}>
                {msg.text}
              </div>
            </div>
          ))}
          {aiLoading && (
            <div className="flex justify-start">
              <div className="bg-gradient-to-br from-teal-100/80 to-teal-200/50 dark:from-slate-800/80 dark:to-slate-900/60 p-3 rounded-2xl shadow-teal-200/40">
                <div className="chat-typing-dots flex items-center gap-1 text-primary">
                  <span /><span /><span />
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="p-6 border-t border-outline-variant/20 bg-surface-variant/10">
          <div className="flex gap-2">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendChat()}
              placeholder="Escribe tu consulta clínica..."
              className="flex-1 px-4 py-3 rounded-xl bg-surface-variant/20 border border-outline-variant/30 outline-none focus:ring-2 focus:ring-primary/20 text-on-surface placeholder:text-on-surface-variant"
            />
            <button onClick={sendChat} disabled={aiLoading} aria-label="Enviar consulta clínica" className="premium-btn w-12 h-12 rounded-xl bg-primary text-on-primary flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-50">
              <Icon name="send" size={20} />
            </button>
          </div>
          <p className="text-[10px] text-outline mt-2 flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full" /> Cumple HIPAA</p>
        </div>
      </div>

      {/* PDF Confirmation Modal */}
      {pdfModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setPdfModalOpen(false)}>
          <div className="glass-panel rounded-3xl p-5 sm:p-6 lg:p-8 max-w-full sm:max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <Icon name="picture_as_pdf" size={28} className="text-error" />
              <h3 className="font-title-md text-title-md">Confirmar Reporte PDF</h3>
            </div>
            <p className="text-sm text-on-surface-variant mb-6">
              {pdfMode === 'simple'
                ? 'Se generará un PDF rápido con los datos de las últimas 20 sesiones del paciente seleccionado.'
                : 'Se generará un PDF estilizado usando IA con los datos del paciente. Esto puede tardar unos segundos.'}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setPdfModalOpen(false)} className="flex-1 px-6 py-3 rounded-xl bg-surface-variant/30 text-on-surface-variant font-bold hover:bg-surface-variant/50 transition-all">
                Cancelar
              </button>
              <button onClick={handleExportPDF} disabled={pdfLoading} className="premium-btn flex-1 px-6 py-3 rounded-xl bg-primary text-on-primary font-bold flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50">
                {pdfLoading ? <><Spinner size={20} className="text-on-primary" /> <LoadingText context="pdf" /></> : 'Generar PDF'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update Patient Modal */}
      {showUpdatePatientModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowUpdatePatientModal(false)}>
          <div className="glass-panel rounded-3xl p-6 max-w-lg w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-on-surface mb-1">Actualizar datos de paciente</h3>
            <p className="text-sm text-on-surface-variant mb-4">Selecciona un paciente y la IA sugerira actualizaciones basadas en el texto extraido.</p>

            <label className="block text-sm font-bold text-on-surface-variant mb-2">Buscar paciente</label>
            <select
              value={updatePatientId}
              onChange={(e) => setUpdatePatientId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-surface-variant/20 text-on-surface border border-divider focus:border-primary focus:outline-none transition-colors mb-4"
            >
              <option value="">Selecciona un paciente...</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.full_name}</option>
              ))}
            </select>

            {updatePatientId && !updateLoading && Object.keys(updatePreview).length === 0 && (
              <button
                onClick={async () => {
                  setUpdateLoading(true);
                  try {
                    const extracted = scanResult as Record<string, unknown>;
                    const fields: Record<string, string> = {};
                    const fieldMap: Record<string, string> = {
                      diagnostico: 'diagnostico',
                      diagnostico_secundario: 'diagnostico_secundario',
                      rom_objetivo: 'rom_objetivo',
                      medicamentos: 'medicamentos_actuales',
                      alergias: 'alergias',
                      telefono: 'telefono',
                      medico_tratante: 'medico_remitente',
                      observaciones: 'notas',
                    };
                    for (const [scanKey, dbKey] of Object.entries(fieldMap)) {
                      const val = extracted[scanKey];
                      if (val != null && String(val).trim() !== '') fields[dbKey] = String(val);
                    }
                    if (Object.keys(fields).length === 0) {
                      toast.error('No se encontraron campos actualizables en el texto extraido');
                    } else {
                      setUpdatePreview(fields);
                    }
                  } catch (e) {
                    toast.error('Error al analizar cambios: ' + (e as Error).message);
                  } finally {
                    setUpdateLoading(false);
                  }
                }}
                className="w-full py-3 rounded-xl bg-teal-600 text-white font-bold hover:bg-teal-700 transition-colors flex items-center justify-center gap-2 min-h-[44px]"
              >
                <Icon name="auto_awesome" size={20} /> Analizar cambios sugeridos
              </button>
            )}

            {updateLoading && (
              <div className="flex items-center justify-center py-6 gap-3">
                <Spinner size={24} className="text-primary" />
                <span className="text-on-surface-variant text-sm">Analizando...</span>
              </div>
            )}

            {Object.keys(updatePreview).length > 0 && (
              <div className="space-y-3 mt-4">
                <p className="text-sm font-bold text-on-surface">Campos a actualizar:</p>
                {Object.entries(updatePreview).map(([key, value]) => (
                  <div key={key} className="p-3 rounded-xl bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800">
                    <p className="text-xs font-bold text-teal-700 dark:text-teal-300 uppercase">{key.replace(/_/g, ' ')}</p>
                    <p className="text-sm text-on-surface mt-1">{value}</p>
                  </div>
                ))}
                <div className="flex gap-3 mt-4">
                  <button onClick={() => setShowUpdatePatientModal(false)} className="flex-1 py-3 rounded-xl bg-surface-variant/30 text-on-surface-variant font-bold hover:bg-surface-variant/50 transition-all">
                    Cancelar
                  </button>
                  <button
                    onClick={async () => {
                      setUpdateLoading(true);
                      try {
                        const { error } = await supabase.from('profiles').update(updatePreview).eq('id', updatePatientId);
                        if (error) throw error;
                        toast.success('Datos del paciente actualizados correctamente');
                        setShowUpdatePatientModal(false);
                        setUpdatePreview({});
                      } catch (e) {
                        toast.error('Error al actualizar: ' + (e as Error).message);
                      } finally {
                        setUpdateLoading(false);
                      }
                    }}
                    disabled={updateLoading}
                    className="premium-btn flex-1 py-3 rounded-xl bg-teal-600 text-white font-bold hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 min-h-[44px]"
                  >
                    Confirmar actualizacion
                  </button>
                </div>
              </div>
            )}

            <button onClick={() => setShowUpdatePatientModal(false)} className="w-full mt-4 py-2 text-on-surface-variant text-sm hover:text-on-surface transition-colors">
              Cerrar
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
