import { motion } from 'framer-motion';
import { ShieldCheck, FileText, HeartPulse, ScrollText, Lock, Stethoscope, Camera, Brain, CheckCircle2, XCircle } from 'lucide-react';
import { GlassModal } from './GlassModal';

export type LegalDocType = 'privacy' | 'terms' | 'consent';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: LegalDocType;
}

/* ------------------------------------------------------------------ */
/*  Legal text content — Spanish, physiotherapy-specific              */
/* ------------------------------------------------------------------ */

interface LegalSection {
  heading: string;
  body: string[];
}

interface LegalDoc {
  title: string;
  subtitle: string;
  lastUpdated: string;
  icon: typeof ShieldCheck;
  sections: LegalSection[];
}

const PRIVACY_DOC: LegalDoc = {
  title: 'Política de Privacidad',
  subtitle: 'Protección de datos personales y datos de salud',
  lastUpdated: 'Julio 2025',
  icon: ShieldCheck,
  sections: [
    {
      heading: '1. Responsable del tratamiento',
      body: [
        'FisioMirror S.A. (en adelante, "FisioMirror" o "el Responsable"), con domicilio en Maracay, Estado Aragua, República Bolivariana de Venezuela, es responsable del tratamiento de los datos personales recabados a través de la plataforma.',
        'Puedes contactarnos a través del correo privacidad@fisiomirror.com.ve para cualquier consulta relacionada con el tratamiento de tus datos personales o el ejercicio de tus derechos.',
      ],
    },
    {
      heading: '2. Datos que tratamos',
      body: [
        'Datos de identificación: nombre y apellido, documento de identidad, correo electrónico, número de teléfono y fotografía de perfil.',
        'Datos profesionales (fisioterapeutas): matrícula profesional, especialidad, institución de egreso y año de graduación.',
        'Datos clínicos (pacientes): diagnóstico, historial de lesiones, plan de tratamiento, ejercicios asignados, registros de sesiones y evolución del paciente.',
        'Datos técnicos: dirección IP, tipo de navegador, dispositivo y métricas de uso de la plataforma con fines de seguridad y mejora del servicio.',
      ],
    },
    {
      heading: '3. Datos de salud — tratamiento especial',
      body: [
        'La información clínica almacenada en FisioMirror constituye un dato sensible en los términos de la Ley de Protección de Datos Personales y Garantía de su Habeas Data de la República Bolivariana de Venezuela, y de la Constitución de la República Bolivariana de Venezuela (art. 60), que consagra el derecho a la protección de la honra, vida privada e intimidad personal y familiar.',
        'El tratamiento de datos de salud se realiza únicamente con fines de asistencia sanitaria, seguimiento terapéutico y mejora de la calidad del tratamiento prescrito por el profesional interviniente.',
        'FisioMirror aplica medidas de seguridad técnicas y organizativas adicionales para los datos de salud, incluyendo cifrado en tránsito (TLS 1.3) y en reposo, segregación lógica de accesos y registro de auditoría de consultas. Asimismo, se cumple con lo dispuesto en la Ley de Infogobierno y demás normativas venezolanas aplicables al tratamiento de datos en sistemas digitales.',
      ],
    },
    {
      heading: '4. Finalidad del tratamiento',
      body: [
        'Gestionar la relación fisioterapeuta-paciente, permitir el seguimiento de planes de ejercicios y registrar la evolución clínica.',
        'Facilitar la comunicación entre profesionales y pacientes mediante videollamadas, mensajería y notificaciones.',
        'Generar indicadores de adherencia y progreso para apoyar la toma de decisiones clínicas del profesional tratante.',
        'Cumplir con obligaciones legales y regulatorias aplicables al ejercicio profesional de la fisioterapia.',
      ],
    },
    {
      heading: '5. Base jurídica y consentimiento',
      body: [
        'El tratamiento de datos personales se fundamenta en el consentimiento libre, informado e inequívoco del titular, conforme a la Ley de Protección de Datos Personales y Garantía de su Habeas Data de la República Bolivariana de Venezuela.',
        'Para el tratamiento de datos de salud, el consentimiento se otorga de manera expresa y específica, y puede ser revocado en cualquier momento sin que ello afecte la legitimidad del tratamiento efectuado con anterioridad.',
        'En cumplimiento del Reglamento General de Protección de Datos (RGPD/UE 2016/679) para usuarios residentes en el Espacio Económico Europeo, la base jurídica adicional incluye la ejecución de un contrato y el cumplimiento de obligaciones legales en materia sanitaria. Para usuarios residentes en Venezuela, se considera adicionalmente lo dispuesto en la Ley de Infogobierno y la Constitución de la República Bolivariana de Venezuela.',
      ],
    },
    {
      heading: '6. Destinatarios y cesiones',
      body: [
        'Tus datos no serán cedidos a terceros con fines comerciales. El acceso a los datos clínicos está restringido exclusivamente al fisioterapeuta vinculado al paciente.',
        'FisioMirror utiliza proveedores de infraestructura (alojamiento y base de datos) que actúan como encargados del tratamiento bajo acuerdos de confidencialidad y conforme a estándares reconocidos internacionalmente (ISO/IEC 27001), respetando la legislación venezolana sobre transferencia internacional de datos.',
        'Los datos podrán ser comunicados a autoridades sanitarias o judiciales cuando exista una obligación legal de hacerlo.',
      ],
    },
    {
      heading: '7. Conservación de los datos',
      body: [
        'Los datos clínicos se conservan durante el período que dure la relación terapéutica y, con posterioridad, durante el plazo legal de conservación de historias clínicas establecido por la normativa sanitaria aplicable en cada jurisdicción.',
        'Los datos de identificacón y registro de actividad se conservan mientras la cuenta esté activa. Podés solicitar la supresión de tu cuenta y datos asociados en cualquier momento.',
      ],
    },
    {
      heading: '8. Derechos del titular de los datos',
      body: [
        'Derecho de acceso: podés solicitar información sobre qué datos tuyos son tratados y para qué finalidad.',
        'Derecho de rectificación: podés corregir datos inexactos o desactualizados directamente desde tu perfil o por solicitud.',
        'Derecho de supresión: podés solicitar la eliminación de tus datos cuando el tratamiento ya no sea necesario.',
        'Derecho de oposición y revocación del consentimiento: podés oponerte al tratamiento y revocar tu consentimiento en cualquier momento.',
        'Derecho de portabilidad: podés solicitar recibir tus datos en un formato estructurado y de uso común.',
        'Para ejercer estos derechos, comunícate a privacidad@fisiomirror.com.ve. El órgano competente en materia de protección de datos en Venezuela es la Autoridad Única de Administración Electrónica (AUAE), conforme a la Ley de Infogobierno.',
      ],
    },
    {
      heading: '9. Medidas de seguridad',
      body: [
        'FisioMirror implementa controles de acceso basados en roles (RBAC), autenticación segura, cifrado de datos y políticas de seguridad a nivel de fila (RLS) en la base de datos.',
        'Toda captura de imagen o video con fines de análisis de movimiento se procesa respetando la privacidad del paciente y no se comparte fuera del ámbito de la relación terapéutica.',
      ],
    },
    {
      heading: '10. Cambios a esta política',
      body: [
        'Podemos actualizar esta política para reflejar cambios en la legislación o en nuestras prácticas. Te notificaremos sobre cambios significativos a través de la plataforma.',
        'La fecha de última actualización se indica al inicio de este documento.',
      ],
    },
  ],
};

const TERMS_DOC: LegalDoc = {
  title: 'Términos de Servicio',
  subtitle: 'Condiciones de uso y conducta profesional',
  lastUpdated: 'Julio 2025',
  icon: FileText,
  sections: [
    {
      heading: '1. Aceptación de los términos',
      body: [
        'Estos Términos de Servicio regulan el acceso y uso de la plataforma FisioMirror. Al registrarte y utilizar la aplicación, aceptás quedar vinculado por estos términos en su totalidad.',
        'Si no estás de acuerdo con alguna de las condiciones aquí establecidas, no deberás acceder ni utilizar la plataforma.',
      ],
    },
    {
      heading: '2. Definiciones y alcance',
      body: [
        'FisioMirror es una plataforma digital de apoyo a la fisioterapia que integra seguimiento de ejercicios, análisis de movimiento asistido por inteligencia artificial y comunicación entre profesionales y pacientes.',
        'La plataforma está destinada exclusivamente a fisioterapeutas matriculados y a los pacientes bajo su cuidado. No constituye un dispositivo médico certificado ni reemplaza la valoración clínica presencial.',
      ],
    },
    {
      heading: '3. Registro y cuentas',
      body: [
        'Los fisioterapeutas deben proporcionar información veraz sobre su identidad y matrícula profesional. FisioMirror se reserva el derecho de verificar la validez de la matrícula.',
        'Los pacientes acceden mediante un token generado por su fisioterapeuta tratante. El paciente es responsable de mantener la confidencialidad de su token de acceso.',
        'Cada usuario es responsable de la actividad realizada desde su cuenta y deberá notificar de inmediato cualquier uso no autorizado.',
      ],
    },
    {
      heading: '4. Obligaciones del fisioterapeuta',
      body: [
        'El profesional declara contar con matrícula habilitante vigente y actuar dentro del ámbito de su competencia legalmente reconocida.',
        'El fisioterapeuta es el único responsable del diagnóstico clínico, el plan de tratamiento y las indicaciones terapéuticas. FisioMirror es una herramienta de apoyo y no emite diagnósticos ni recomendaciones autónomas.',
        'El profesional se compromete a mantener un trato respetuoso hacia los pacientes, a respetar la confidencialidad de los datos clínicos y a actuar conforme al código de ética profesional vigente.',
      ],
    },
    {
      heading: '5. Obligaciones del paciente',
      body: [
        'El paciente se compromete a seguir las indicaciones de su fisioterapeuta y a proporcionar información veraz sobre su estado de salud y evolución.',
        'El paciente reconoce que las funcionalidades de análisis de movimiento y asistencia por IA son complementarias y no sustituyen la indicación profesional.',
        'El paciente deberá utilizar la plataforma de manera lícita, sin intentar alterar, dañar o acceder indebidamente a los sistemas de FisioMirror.',
      ],
    },
    {
      heading: '6. Inteligencia artificial — alcance y limitaciones',
      body: [
        'Las funcionalidades de IA de FisioMirror (análisis de postura, conteo de repeticiones, asistencia conversacional) tienen fines de apoyo al seguimiento terapéutico y no constituyen un diagnóstico médico.',
        'Las recomendaciones generadas por la IA son orientativas y deben ser validadas por el fisioterapeuta tratante antes de su aplicación.',
        'El uso de la IA no exime al profesional de su responsabilidad clínica sobre las decisiones terapéuticas.',
      ],
    },
    {
      heading: '7. Uso aceptable',
      body: [
        'No está permitido utilizar la plataforma para almacenar o transmitir contenido ilícito, ofensivo o que viole derechos de terceros.',
        'No está permitido realizar ingeniería inversa, extraer masivamente datos o intentar comprometer la seguridad de la plataforma.',
        'El uso comercial de la plataforma por parte de terceros no autorizados está expresamente prohibido.',
      ],
    },
    {
      heading: '8. Propiedad intelectual',
      body: [
        'FisioMirror conserva todos los derechos sobre el software, el diseño, las marcas y los contenidos propios de la plataforma.',
        'Los datos clínicos ingresados pertenecen al paciente y al profesional tratante en el marco de la relación terapéutica.',
      ],
    },
    {
      heading: '9. Limitación de responsabilidad',
      body: [
        'FisioMirror es una herramienta de apoyo y no asume responsabilidad por las decisiones clínicas adoptadas a partir de su uso. La responsabilidad profesional recae exclusivamente sobre el fisioterapeuta tratante.',
        'FisioMirror no garantiza disponibilidad ininterrumpida del servicio. Las funcionalidades pueden sufrir interrupciones por mantenimiento o causas técnicas.',
        'En la máxima medida permitida por la ley, la responsabilidad de FisioMirror frente al usuario se limita al importe abonado por el servicio durante los tres (3) meses anteriores al evento generador.',
      ],
    },
    {
      heading: '10. Suspensión y resolución',
      body: [
        'FisioMirror podrá suspender o dar de baja cuentas que infrinjan estos términos, que presenten información falsa o que comprometan la seguridad de la plataforma, conforme a la Ley de Infogobierno y demás normativas venezolanas aplicables.',
        'El usuario podrá dar de baja su cuenta en cualquier momento desde la configuración de la aplicación.',
      ],
    },
    {
      heading: '11. Modificaciones y legislación aplicable',
      body: [
        'Podemos actualizar estos términos cuando sea necesario. Las modificaciones se publicarán en la plataforma y entrarán en vigor a partir de su publicación.',
        'Estos términos se rigen por las leyes de la República Bolivariana de Venezuela. Cualquier controversia se someterá a los tribunales competentes del Estado Aragua, con jurisdicción en las ciudades de Maracay, La Victoria, Turmero y el resto del territorio nacional.',
      ],
    },
  ],
};

const CONSENT_DOC: LegalDoc = {
  title: 'Consentimiento Informado',
  subtitle: 'Autorización para uso de IA, procesamiento de datos y captura con cámara',
  lastUpdated: 'Julio 2025',
  icon: HeartPulse,
  sections: [
    {
      heading: '1. Propósito de este consentimiento',
      body: [
        'El presente consentimiento informado tiene por objeto autorizar de manera expresa el uso de las funcionalidades de FisioMirror que implican el tratamiento de datos de salud, la utilización de inteligencia artificial y la captura de imágenes mediante la cámara del dispositivo.',
        'Este consentimiento se otorga con pleno conocimiento de su contenido y puede ser revocado en cualquier momento sin afectar el tratamiento realizado con anterioridad.',
      ],
    },
    {
      heading: '2. Consentimiento para el tratamiento de datos de salud',
      body: [
        'Autorizo a FisioMirror S.A. a tratar mis datos de salud (diagnóstico, plan de tratamiento, registros de ejercicios y evolución) con fines de asistencia, seguimiento terapéutico y mejora de la calidad de atención.',
        'Comprendo que mis datos clínicos serán accesibles únicamente por el fisioterapeuta vinculado a mi tratamiento y que se aplican medidas de seguridad adicionales por tratarse de datos sensibles conforme a la Ley de Protección de Datos Personales y Garantía de su Habeas Data de la República Bolivariana de Venezuela.',
        'Soy consciente de que puedo ejercer mis derechos de acceso, rectificación, supresión y oposición comunicándome con privacidad@fisiomirror.com.ve.',
      ],
    },
    {
      heading: '3. Consentimiento para el uso de inteligencia artificial',
      body: [
        'Autorizo el uso de las herramientas de inteligencia artificial de FisioMirror, incluyendo el análisis de postura y movimiento, el conteo automático de repeticiones y el asistente conversacional "Physi".',
        'Comprendo que estas funcionalidades tienen carácter orientativo y de apoyo, y que no reemplazan el diagnóstico ni las indicaciones de mi fisioterapeuta tratante.',
        'Acepto que las observaciones generadas por la IA deben ser validadas por el profesional antes de modificar mi plan de tratamiento.',
        'Reconozco que el asistente conversacional puede procesar mis consultas para generar respuestas contextualizadas, y que dichas interacciones pueden almacenarse para mejorar la calidad del servicio.',
      ],
    },
    {
      heading: '4. Consentimiento para el uso de cámara y realidad aumentada',
      body: [
        'Autorizo el acceso a la cámara de mi dispositivo para las funcionalidades de análisis de movimiento, guía visual de ejercicios mediante realidad aumentada (AR) y videollamadas con mi fisioterapeuta.',
        'Comprendo que el procesamiento de las imágenes se realiza en el contexto de mi tratamiento y que las grabaciones o capturas no se comparten fuera del ámbito de la relación terapéutica.',
        'Reconozco que el análisis de movimiento se realiza sobre mi cuerpo en tiempo real para evaluar la ejecución de los ejercicios y que puedo detener la captura en cualquier momento cerrando la cámara o saliendo de la funcionalidad.',
        'Las imágenes utilizadas para el análisis de postura se procesan respetando mi privacidad y no se utilizan para fines de identificación biométrica.',
      ],
    },
    {
      heading: '5. Voluntariedad y revocación',
      body: [
        'Presto este consentimiento de manera voluntaria, sin coacción, y con la posibilidad de no otorgarlo o revocarlo posteriormente sin que ello afecte mi atención sanitaria de manera discriminatoria.',
        'La revocación del consentimiento podrá efectuarse desde la configuración de la aplicación o por comunicación a privacidad@fisiomirror.com.ve.',
      ],
    },
    {
      heading: '6. Confirmación',
      body: [
        'Al marcar mi aceptación dentro de la plataforma, declaro haber leído y comprendido el presente consentimiento informado en todos sus términos.',
        'Reconozco que esta autorización se otorga conforme a la Ley de Protección de Datos Personales y Garantía de su Habeas Data, la Ley de Infogobierno de la República Bolivariana de Venezuela y el Reglamento General de Protección de Datos (RGPD/UE 2016/679) cuando corresponda.',
      ],
    },
  ],
};

const DOCS: Record<LegalDocType, LegalDoc> = {
  privacy: PRIVACY_DOC,
  terms: TERMS_DOC,
  consent: CONSENT_DOC,
};

/* ------------------------------------------------------------------ */
/*  Visual helpers                                                     */
/* ------------------------------------------------------------------ */

function DocHeader({ doc }: { doc: LegalDoc }) {
  const Icon = doc.icon;
  return (
    <div className="flex flex-col items-center text-center mb-6 pb-6 border-b divider-teal">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 20, stiffness: 280 }}
        className="w-16 h-16 rounded-2xl bg-primary-container/40 flex items-center justify-center mb-4 ring-1 ring-primary/20 glow-teal breathe-teal"
      >
        <Icon size={32} className="text-primary animate-breathe-icon" />
      </motion.div>
      <h2 className="font-headline-lg text-headline-lg-mobile lg:text-headline-lg gradient-text-living font-bold">
        {doc.title}
      </h2>
      <p className="text-sm text-on-surface-variant mt-1">{doc.subtitle}</p>
      <div className="flex items-center gap-2 mt-3 text-[11px] text-outline">
        <ScrollText size={14} />
        <span>Última actualización: {doc.lastUpdated}</span>
      </div>
    </div>
  );
}

/* Small icon legend shown at the top of consent doc */
function ConsentLegend() {
  const items = [
    { icon: Brain, label: 'Inteligencia Artificial' },
    { icon: Lock, label: 'Datos de salud' },
    { icon: Camera, label: 'Cámara y AR' },
    { icon: Stethoscope, label: 'Ámbito terapéutico' },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 mb-6">
      {items.map((it) => (
        <div
          key={it.label}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-container-low/60 border divider-teal"
        >
          <it.icon size={16} className="text-primary shrink-0" />
          <span className="text-[11px] font-medium text-on-surface-variant">{it.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function LegalModal({ isOpen, onClose, type }: LegalModalProps) {
  const doc = DOCS[type];
  const showConsentLegend = type === 'consent';

  return (
    <GlassModal isOpen={isOpen} onClose={onClose} size="lg" dismissable>
      <div className="pr-2">
        <DocHeader doc={doc} />
        {showConsentLegend && <ConsentLegend />}

        <div className="space-y-6">
          {doc.sections.map((section, sIdx) => (
            <motion.section
              key={sIdx}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: sIdx * 0.05, duration: 0.3 }}
            >
              <h3 className="font-title-md text-title-md text-on-surface font-bold mb-2 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-primary shrink-0" />
                {section.heading}
              </h3>
              <div className="space-y-2 pl-1">
                {section.body.map((para, pIdx) => (
                  <p key={pIdx} className="text-sm text-on-surface-variant leading-relaxed">
                    {para}
                  </p>
                ))}
              </div>
            </motion.section>
          ))}
        </div>

        {/* Footer note */}
        <div className="mt-6 pt-4 border-t divider-teal flex items-start gap-2">
          <XCircle size={16} className="text-outline shrink-0 mt-0.5" />
          <p className="text-[11px] text-outline leading-relaxed">
            Este documento tiene carácter informativo y no constituye asesoramiento legal. En caso de
            duda sobre el alcance de estas condiciones, consultá a tu profesional de confianza o
            escríbenos a privacidad@fisiomirror.com.ve.
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-5 py-3 rounded-xl bg-primary text-on-primary font-bold hover:scale-[0.98] active:scale-95 transition-all glow-teal breathe-teal"
        >
          Cerrar
        </button>
      </div>
    </GlassModal>
  );
}
