import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Icon } from './Icon';
import { GlassModal } from './GlassModal';

const FAQS: Record<string, { q: string; a: string }[]> = {
  '/dashboard-fisio': [
    { q: '¿Cómo veo el detalle de un paciente?', a: 'Ve a la sección "Pacientes" en el menú lateral y haz clic en cualquier paciente para ver su expediente completo.' },
    { q: '¿Qué son los insights?', a: 'Son análisis generados por Physi basados en el progreso de tus pacientes. Te ayudan a tomar decisiones clínicas informadas.' },
    { q: '¿Cómo genero un token para un paciente?', a: 'En el menú lateral, ve a "Tokens" y haz clic en "Generar Token". Comparte el código de 6 dígitos con tu paciente.' },
  ],
  '/patients': [
    { q: '¿Cómo añado un nuevo paciente?', a: 'Genera un token en la sección "Tokens" y compártelo con el paciente. Él se registrará usando ese código.' },
    { q: '¿Puedo filtrar pacientes por etiqueta?', a: 'Sí, usa los chips de filtro debajo del buscador para filtrar por etiquetas como "Activo", "Nuevo", etc.' },
  ],
  '/tools': [
    { q: '¿Qué hace el OCR Clínico?', a: 'Escanea recetas médicas o documentos clínicos y extrae automáticamente los datos para cargarlos en el formulario del paciente.' },
    { q: '¿Cómo exporto un PDF?', a: 'Usa la herramienta "Exportar Reporte PDF" para generar un informe profesional estilizado por IA.' },
  ],
  '/dashboard-paciente': [
    { q: '¿Cómo inicio mi rutina de ejercicios?', a: 'Ve a "Mi Rutina" en el menú inferior y selecciona el ejercicio que tu fisioterapeuta te asignó.' },
    { q: '¿Qué es el modo AR?', a: 'Es un espejo aumentado que usa tu cámara para mostrarte en tiempo real mientras haces los ejercicios, con guía visual.' },
  ],
  '/exercises': [
    { q: '¿Cuántas repeticiones debo hacer?', a: 'Sigue las indicaciones de tu fisioterapeuta. Cada ejercicio muestra las series y repeticiones recomendadas.' },
    { q: '¿Puedo repetir un ejercicio?', a: 'Sí, puedes repetir cualquier ejercicio las veces que quieras dentro de tu rutina diaria.' },
  ],
  '/stats': [
    { q: '¿Qué muestra mi progreso?', a: 'Consulta tus sesiones completadas, minutos de práctica y evolución semanal en esta sección.' },
    { q: '¿Cómo mejoro mi racha?', a: 'Completa al menos una sesión cada día y sigue la rutina asignada por tu fisioterapeuta.' },
  ],
  '/profile': [
    { q: '¿Cómo actualizo mi perfil?', a: 'Edita tus datos personales y guarda los cambios desde el botón de guardar.' },
    { q: '¿Quién puede ver mis datos?', a: 'Solo tú y el fisioterapeuta vinculado a tu cuenta pueden consultar tu información clínica.' },
  ],
  '/settings': [
    { q: '¿Cómo cambio mi contraseña?', a: 'Abre Configuración, introduce tu nueva contraseña y confirma el cambio.' },
    { q: '¿Cómo activo el modo oscuro?', a: 'Usa el botón de tema en la cabecera para alternar entre modo claro y oscuro.' },
  ],
  '/calibration': [
    { q: '¿Cómo calibro la cámara?', a: 'Colócate frente a la cámara con todo el cuerpo visible y levanta una mano cuando se indique.' },
    { q: '¿Puedo saltar la calibración?', a: 'Sí, aunque calibrar mejora la precisión del seguimiento durante la sesión AR.' },
  ],
  '/ar-mirror': [
    { q: '¿Cómo uso el modo AR?', a: 'Sigue las indicaciones en pantalla y realiza el ejercicio frente a la cámara para recibir feedback.' },
    { q: '¿Qué hago si no detecta mi cuerpo?', a: 'Mejora la iluminación, aléjate de la cámara y asegúrate de que todo tu cuerpo sea visible.' },
  ],
  '/ai-assistant': [
    { q: '¿Qué puedo preguntarle a Physi?', a: 'Puedes preguntar sobre tus ejercicios, rutina, recuperación, dolor o progreso.' },
    { q: '¿Cómo envío una consulta?', a: 'Escribe tu pregunta en el cuadro de texto y pulsa enviar. También puedes usar el micrófono.' },
  ],
  '/fisio-exercises': [
    { q: '¿Cómo creo una rutina?', a: 'Selecciona ejercicios, configura series y repeticiones y asígnalos al paciente correspondiente.' },
    { q: '¿Cómo asigno ejercicios?', a: 'Abre el paciente desde Pacientes y utiliza la opción para asignar o actualizar su rutina.' },
  ],
  '/fisio-stats': [
    { q: '¿Qué muestran las estadísticas?', a: 'Consulta adherencia, sesiones, evolución y resultados de tus pacientes.' },
    { q: '¿Puedo exportar un reporte?', a: 'Usa las acciones de exportación disponibles para generar un informe de progreso.' },
  ],
  '/fisio-profile': [
    { q: '¿Cómo actualizo mi perfil profesional?', a: 'Edita tus datos profesionales y guarda los cambios desde esta sección.' },
    { q: '¿Cómo vinculo pacientes?', a: 'Genera un token y compártelo con el paciente para completar la vinculación.' },
  ],
  '/fisio-settings': [
    { q: '¿Cómo cambio mi contraseña?', a: 'Introduce y confirma la nueva contraseña en Configuración.' },
    { q: '¿Cómo activo el modo oscuro?', a: 'Pulsa el botón de tema en la cabecera para cambiar la apariencia.' },
  ],
  '/patient-detail': [
    { q: '¿Qué puedo consultar del paciente?', a: 'Revisa su expediente, progreso, sesiones y rutina asignada desde su ficha.' },
    { q: '¿Cómo asigno una rutina?', a: 'Usa la acción de ejercicios de la ficha para crear o actualizar su plan.' },
  ],
  '/ocr-scanner': [
    { q: '¿Cómo cargo un paciente?', a: 'Escanea o carga la documentación clínica y revisa los datos antes de crear el expediente.' },
    { q: '¿Qué documentos admite el OCR?', a: 'Utiliza recetas o informes clínicos legibles y bien iluminados para obtener mejores resultados.' },
  ],
};

const DEFAULT_FAQS = [
  { q: '¿Cómo contacto a mi fisioterapeuta?', a: 'Usa el botón flotante de contacto en tu dashboard para llamar, enviar WhatsApp o videollamar.' },
  { q: '¿Qué hago si tengo dolor?', a: 'Detén el ejercicio inmediatamente y contacta a tu fisioterapeuta a través del botón de contacto.' },
  { q: '¿Mis datos están seguros?', a: 'Sí, FisioMirror cumple con las normativas de protección de datos de salud. Tu información está cifrada y solo tu fisioterapeuta puede verla.' },
];

interface HelpGuideButtonProps {
  onStartTour?: () => void;
}

export function HelpGuideButton({ onStartTour }: HelpGuideButtonProps) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const faqs = FAQS[location.pathname] || DEFAULT_FAQS;

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setOpen(true)}
        className="flex items-center justify-center w-10 h-10 rounded-full glass-panel text-primary hover:text-primary-600 transition-colors breathe-badge"
        aria-label="Ayuda"
      >
        <Icon name="help" size={20} />
      </motion.button>

      <GlassModal isOpen={open} onClose={() => setOpen(false)} size="md">
        <div className="p-4 sm:p-6 max-h-[80vh] overflow-y-auto overflow-x-hidden w-full max-w-[calc(100vw-2rem)] sm:max-w-lg break-words">
          <div className="flex items-center justify-between mb-4 gap-2 min-w-0">
            <h3 className="font-title-md text-title-md gradient-text-teal pr-2 break-words whitespace-normal min-w-0">Preguntas Frecuentes</h3>
            <button onClick={() => setOpen(false)} className="text-on-surface-variant hover:text-error transition-colors shrink-0">
              <Icon name="close" size={20} />
            </button>
          </div>
          {onStartTour && (
            <button
              onClick={() => {
                setOpen(false);
                onStartTour();
              }}
              className="w-full mb-4 flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-on-primary transition-transform hover:scale-[1.01] break-words whitespace-normal overflow-hidden"
            >
              <Icon name="tour" size={18} />
              Ver guía inicial
            </button>
          )}
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="p-3 sm:p-4 rounded-xl bg-surface-container-low/60 border border-outline-variant/20 break-words">
                <p className="font-semibold text-on-surface text-sm mb-1 break-words whitespace-normal">{faq.q}</p>
                <p className="text-sm text-on-surface-variant leading-relaxed break-words whitespace-normal">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </GlassModal>
    </>
  );
}
