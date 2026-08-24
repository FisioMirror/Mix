export interface FAQ {
  keywords: string[];
  question: string;
  answer: string;
}

/**
 * Base de conocimientos local de Physi (offline).
 * El matcher puntúa por coincidencia de palabras clave en el texto del usuario.
 * Todas las respuestas están en español y usan formato markdown básico.
 */
export const PHYSI_FAQS: FAQ[] = [
  {
    keywords: ['agregar', 'añadir', 'cargar', 'registrar', 'nuevo', 'crear', 'paciente', 'alta'],
    question: '¿Cómo agrego o cargo un paciente?',
    answer:
      'Para agregar un paciente nuevo:\n\n' +
      '- Ve al **Dashboard** y pulsa el botón **"+ Paciente"** (esquina superior derecha).\n' +
      '- Completa los datos: nombre, diagnóstico, fecha de nacimiento y teléfono.\n' +
      '- Pulsa **Guardar** y el paciente aparecerá en tu lista de activos.\n\n' +
      'También puedes importar recetas médicas con **OCR** desde la ficha del paciente.',
  },
  {
    keywords: ['rutina', 'ejercicio', 'crear', 'asignar', 'plan', 'programa', 'serie', 'repeticion', 'frecuencia'],
    question: '¿Cómo creo una rutina de ejercicios?',
    answer:
      'Para crear una rutina de ejercicios:\n\n' +
      '1. Abre la ficha del paciente y selecciona **Rutinas**.\n' +
      '2. Pulsa **"+ Nueva rutina"** y elige los ejercicios del catálogo.\n' +
      '3. Define **series**, **repeticiones** y **frecuencia semanal**.\n' +
      '4. Añade notas opcionales (postura, ritmo, precauciones).\n' +
      '5. Guarda la rutina y estará disponible para el paciente.\n\n' +
      'Las rutinas activas se resaltan en el progreso del paciente.',
  },
  {
    keywords: ['ar', 'espejo', 'espejo ar', 'calibrar', 'calibracion', 'camara', 'pose', 'movimiento', 'tracking'],
    question: '¿Cómo uso el modo espejo AR y la calibración?',
    answer:
      'El modo espejo AR te permite guiar al paciente en tiempo real:\n\n' +
      '- Pulsa **"Modo Espejo"** en la ficha del paciente o en la barra flotante.\n' +
      '- Permite el acceso a la cámara cuando el navegador lo solicite.\n' +
      '- Realiza la **calibración inicial**: ponte de frente a la cámara y mantén la pose 3 segundos.\n' +
      '- Una vez calibrado, el sistema detecta tu postura y la muestra superpuesta al paciente.\n\n' +
      'Si necesitas recalibrar, pulsa **"Recalibrar"** en cualquier momento.',
  },
  {
    keywords: ['informe', 'pdf', 'reporte', 'exportar', 'descargar', 'documento'],
    question: '¿Cómo genero un informe PDF?',
    answer:
      'Para exportar un informe en PDF:\n\n' +
      '- Entra en la ficha del paciente y abre la pestaña **Progreso**.\n' +
      '- Pulsa el ícono **"Descargar PDF"** (arriba a la derecha).\n' +
      '- Elige el rango de fechas si lo necesitas y confirma.\n' +
      '- El informe incluye sesiones, métricas de calidad y evolución del paciente.\n\n' +
      'El PDF se descarga automáticamente a tu dispositivo.',
  },
  {
    keywords: ['estadistica', 'metrica', 'progreso', 'grafico', 'evolucion', 'dato', 'porcentaje', 'calidad'],
    question: '¿Cómo interpreto las estadísticas?',
    answer:
      'Las estadísticas del dashboard muestran:\n\n' +
      '- **Sesiones completadas**: total de sesiones realizadas por el paciente.\n' +
      '- **Calidad de ejecución**: porcentaje medio de precisión del movimiento.\n' +
      '- **Dolor reportado**: escala 0-10 reportada por el paciente tras cada sesión.\n' +
      '- **Racha actual**: días consecutivos con sesiones registradas.\n' +
      '- **Tendencia**: flechas verde/roja que indican mejora o empeoramiento.\n\n' +
      'Una **calidad >80%** y **dolor ≤3** indican buena evolución.',
  },
  {
    keywords: ['ocr', 'receta', 'escanear', 'foto receta', 'reconocimiento', 'texto', 'prescripcion'],
    question: '¿Cómo funciona el OCR de recetas?',
    answer:
      'El OCR reconoce automáticamente el texto de una receta médica:\n\n' +
      '- En la ficha del paciente pulsa **"Escanear receta"**.\n' +
      '- Sube o toma una foto legible de la receta.\n' +
      '- El sistema extrae **diagnóstico, medicamentos y indicaciones**.\n' +
      '- Revisa los datos detectados y confirma para guardarlos en la ficha.\n\n' +
      'Consejo: usa buena iluminación y encuadra todo el texto para mayor precisión.',
  },
  {
    keywords: ['tamaño', 'letra', 'texto', 'tipografia', 'fuente', 'zoom', 'accesibilidad', 'legibilidad'],
    question: '¿Cómo cambio el tamaño de letra?',
    answer:
      'Para ajustar el tamaño de letra:\n\n' +
      '- Ve a **Configuración → Accesibilidad**.\n' +
      '- Usa el control deslizante **"Tamaño de texto"**.\n' +
      '- Hay tres niveles: **Pequeño, Normal y Grande**.\n' +
      '- El cambio se aplica al instante a toda la app.\n\n' +
      'Esta opción es ideal para pacientes con baja visión.',
  },
  {
    keywords: ['modo oscuro', 'oscuro', 'dark', 'tema', 'noche', 'claro', 'claro oscuro'],
    question: '¿Cómo activo el modo oscuro?',
    answer:
      'Para activar el modo oscuro:\n\n' +
      '- Ve a **Configuración → Apariencia**.\n' +
      '- Activa el interruptor **"Modo oscuro"**.\n' +
      '- La app cambia inmediatamente a la paleta oscura (teal sobre fondo oscuro).\n\n' +
      'También puedes elegir **"Automático"** para seguir el tema del sistema operativo.',
  },
  {
    keywords: ['foto', 'perfil', 'avatar', 'imagen perfil', 'subir foto', 'cambiar foto'],
    question: '¿Cómo subo mi foto de perfil?',
    answer:
      'Para actualizar tu foto de perfil:\n\n' +
      '- Ve a **Configuración → Mi perfil**.\n' +
      '- Pulsa sobre el círculo con tu avatar actual.\n' +
      '- Selecciona una imagen desde tu dispositivo (JPG o PNG).\n' +
      '- Recorta la imagen si es necesario y guarda.\n\n' +
      'La foto se sincroniza y aparece en el header y tus mensajes.',
  },
  {
    keywords: ['soporte', 'contacto', 'ayuda', 'contactar', 'email', 'correo', 'fisiomirror', 'proton', 'problema', 'bug'],
    question: '¿Cómo contacto al soporte?',
    answer:
      'Si necesitas ayuda puedes escribirnos a:\n\n' +
      '📧 **fisioMirror@proton.me**\n\n' +
      'Incluye en el correo:\n' +
      '- Tu nombre de clínica o usuario.\n' +
      '- Una captura del problema si es posible.\n' +
      '- Una breve descripción de los pasos que seguiste.\n\n' +
      'Respondemos normalmente en menos de 24 horas.',
  },
  {
    keywords: ['ia', 'ai', 'herramientas ia', 'asistente', 'inteligencia artificial', 'analisis', 'fisiomirror asistent'],
    question: '¿Cómo uso las herramientas de IA?',
    answer:
      'FisioMirror integra IA de dos formas:\n\n' +
      '- **Asistente IA** (página dedicada): analiza tus movimientos y sugiere ejercicios personalizados. Permite enviar texto, imágenes y voz.\n' +
      '- **Physi** (este chatbot): guía rápida offline sobre el uso de la app.\n\n' +
      'Para abrir el Asistente IA pulsa el ícono **"Asistente IA"** en la barra lateral o el menú flotante.',
  },
  {
    keywords: ['ver', 'progreso', 'evolucion', 'historial', 'sesiones', 'registro'],
    question: '¿Cómo veo el progreso del paciente?',
    answer:
      'Para consultar el progreso de un paciente:\n\n' +
      '- Abre la ficha del paciente y selecciona **"Progreso"**.\n' +
      '- Verás un gráfico con **sesiones, calidad y dolor** a lo largo del tiempo.\n' +
      '- Abajo aparece el listado cronológico de sesiones completadas.\n' +
      '- Usa el selector de fechas para filtrar un periodo concreto.\n\n' +
      'Desde aquí también puedes **descargar el informe PDF**.',
  },
  {
    keywords: ['asignar', 'ejercicio', 'prescribir', 'dar ejercicio', 'enviar ejercicio', 'asignar ejercicio'],
    question: '¿Cómo asigno ejercicios a un paciente?',
    answer:
      'Para asignar ejercicios:\n\n' +
      '1. Abre la ficha del paciente y ve a **Rutinas**.\n' +
      '2. Crea una rutina nueva o edita una existente.\n' +
      '3. Añade ejercicios del catálogo y define series y repeticiones.\n' +
      '4. Pulsa **Guardar** para asignar la rutina al paciente.\n\n' +
      'El paciente verá los ejercicios activos en su vista.',
  },
  {
    keywords: ['videollamada', 'video', 'llamada', 'video llamada', 'llamar', 'remoto', 'teleconsulta'],
    question: '¿Cómo inicio una videollamada?',
    answer:
      'Para iniciar una videollamada con un paciente:\n\n' +
      '- Abre la ficha del paciente y pulsa **"Videollamada"**.\n' +
      '- Permite acceso a cámara y micrófono.\n' +
      '- Comparte el enlace de la sesión con el paciente.\n' +
      '- Cuando el paciente se conecte, la sesión comienza automáticamente.\n\n' +
      'Durante la llamada puedes activar el modo espejo AR para guiar movimientos.',
  },
  {
    keywords: ['chatbot', 'physi', 'guia', 'este chat', 'como usas', 'que eres', 'quien eres'],
    question: '¿Cómo uso el chatbot Physi?',
    answer:
      '¡Estás usándolo ahora! Soy **Physi**, tu guía rápida offline de FisioMirror.\n\n' +
      '- Escribe tu pregunta en lenguaje natural (ej: "¿cómo creo una rutina?").\n' +
      '- O pulsa una de las **sugerencias** que aparecen según la pantalla donde estés.\n' +
      '- Te responderé al instante sin necesidad de conexión al servidor.\n\n' +
      'Si no entiendo tu pregunta, prueba con términos como **paciente, rutina, AR** o contacta a soporte.',
  },
  {
    keywords: ['vitrina', 'logro', 'trofeo', 'insignia', 'badge', 'recompensa', 'medalla'],
    question: '¿Qué es la vitrina de logros?',
    answer:
      'La **Vitrina de logros** muestra los hitos alcanzados por el paciente:\n\n' +
      '- **Racha de 7 días** de sesiones consecutivas.\n' +
      '- **Primera sesión completada**.\n' +
      '- **Calidad perfecta** (100% en una sesión).\n' +
      '- **Sin dolor** durante una semana.\n' +
      '- **30 sesiones** acumuladas.\n\n' +
      'Cada logro desbloquea una insignia animada que el paciente puede ver en su perfil.',
  },
  {
    keywords: ['notificacion', 'alerta', 'aviso', 'recordatorio', 'configurar notificaciones', 'push'],
    question: '¿Cómo configuro las notificaciones?',
    answer:
      'Para gestionar las notificaciones:\n\n' +
      '- Ve a **Configuración → Notificaciones**.\n' +
      '- Activa o desactiva cada tipo:\n' +
      '  - **Nuevos pacientes** asignados.\n' +
      '  - **Sesiones completadas** por tus pacientes.\n' +
      '  - **Reportes de dolor** altos (≥7).\n' +
      '  - **Recordatorios** de rutinas pendientes.\n' +
      '- Guarda los cambios.\n\n' +
      'Las notificaciones aparecen en la campana del header.',
  },
  {
    keywords: ['clinica', 'nombre clinica', 'editar clinica', 'cambiar nombre', 'configuracion clinica'],
    question: '¿Cómo edito el nombre de mi clínica?',
    answer:
      'Para cambiar el nombre de la clínica:\n\n' +
      '- Ve a **Configuración → Clínica**.\n' +
      '- Pulsa sobre el campo **"Nombre de la clínica"**.\n' +
      '- Escribe el nuevo nombre y pulsa **Guardar**.\n\n' +
      'El nombre se actualiza en el header, los informes PDF y los correos de invitación.',
  },
  {
    keywords: ['omitir', 'saltar', 'calibracion', 'saltar calibracion', 'omitir calibracion', 'sin calibrar'],
    question: '¿Cómo omito la calibración del modo espejo?',
    answer:
      'Puedes saltar la calibración inicial del modo espejo AR:\n\n' +
      '- Cuando aparezca la pantalla de calibración, pulsa **"Omitir"** (abajo a la derecha).\n' +
      '- Entrarás directamente al modo espejo con detección de pose estándar.\n\n' +
      '⚠️ Sin calibrar, la precisión del seguimiento puede ser menor. Recomendamos calibrar la primera vez.',
  },
  {
    keywords: ['camara', 'no funciona', 'no se ve', 'error camara', 'permisos camara', 'webcam', 'no detecta'],
    question: '¿Qué hago si la cámara no funciona?',
    answer:
      'Si la cámara no se inicia en el modo espejo AR:\n\n' +
      '1. **Verifica los permisos** del navegador: el sitio debe tener acceso a la cámara.\n' +
      '2. **Cierra otras apps** que estén usando la cámara (Zoom, Teams, etc.).\n' +
      '3. **Recarga la página** e inténtalo de nuevo.\n' +
      '4. Prueba con **Chrome o Edge** (mejor soporte para AR).\n' +
      '5. Si persiste, revisa que ninguna pestaña bloquea la cámara.\n\n' +
      'Si el problema continúa, contacta a soporte: **fisioMirror@proton.me**.',
  },
  {
    keywords: ['pacientes activos', 'activos', 'lista pacientes', 'ver pacientes', 'cuantos pacientes', 'mis pacientes'],
    question: '¿Cómo veo mis pacientes activos?',
    answer:
      'Para ver tus pacientes activos:\n\n' +
      '- En el **Dashboard** aparecerá la tarjeta **"Pacientes activos"** con el total.\n' +
      '- Pulsa la tarjeta para abrir la lista completa.\n' +
      '- Cada paciente muestra nombre, diagnóstico y última sesión.\n' +
      '- Usa el buscador superior para filtrar por nombre.\n\n' +
      'Los pacientes dados de baja aparecen en una pestaña separada **"Inactivos"**.',
  },
  {
    keywords: ['fab', 'menu flotante', 'boton flotante', 'flotante', 'menu', 'acceso rapido'],
    question: '¿Cómo uso el menú flotante (FAB)?',
    answer:
      'El **menú flotante (FAB)** es el botón redondo que aparece en la esquina inferior derecha:\n\n' +
      '- **Púlsalo una vez** para expandir accesos rápidos.\n' +
      '- Contiene: **Modo Espejo, Nueva rutina, Asistente IA y Videollamada**.\n' +
      '- Pulsa cualquier ícono para ir directo a esa función.\n' +
      '- Pulsa fuera del menú o vuelve a pulsar el FAB para cerrarlo.\n\n' +
      'El FAB está disponible en todas las pantallas principales.',
  },
  {
    keywords: ['cerrar', 'cerrar sesion', 'logout', 'salir', 'desconectar', 'cerrar cuenta'],
    question: '¿Cómo cierro sesión?',
    answer:
      'Para cerrar sesión en FisioMirror:\n\n' +
      '- Ve a **Configuración → Cuenta**.\n' +
      '- Pulsa el botón rojo **"Cerrar sesión"** al final.\n' +
      '- Confirma en el diálogo emergente.\n\n' +
      'Se cerrará tu sesión y volverás a la pantalla de inicio. Tus datos quedan guardados.',
  },
  {
    keywords: ['contraseña', 'password', 'cambiar contraseña', 'clave', 'seguridad', 'cambiar clave'],
    question: '¿Cómo cambio mi contraseña?',
    answer:
      'Para cambiar tu contraseña:\n\n' +
      '- Ve a **Configuración → Cuenta → Seguridad**.\n' +
      '- Introduce tu contraseña actual.\n' +
      '- Escribe la nueva contraseña (mínimo 8 caracteres).\n' +
      '- Confírmala y pulsa **"Actualizar contraseña"**.\n\n' +
      'Si la olvidaste, usa **"Recuperar contraseña"** en la pantalla de inicio para recibir un correo.',
  },
  {
    keywords: ['color', 'colores', 'dashboard', 'que significa', 'verde', 'amarillo', 'rojo', 'teal', 'semáforo'],
    question: '¿Qué significa cada color en el dashboard?',
    answer:
      'El dashboard usa un código de colores tipo semáforo:\n\n' +
      '- 🟢 **Verde / Teal**: estado bueno — calidad alta, dolor bajo, racha activa.\n' +
      '- 🟡 **Amarillo**: estado regular — atención recomendada, métricas medias.\n' +
      '- 🔴 **Rojo**: estado crítico — dolor alto o calidad baja, requiere intervención.\n' +
      '- 🔵 **Azul**: información general o neutra.\n\n' +
      'Cada tarjeta del dashboard muestra un punto de color con su estado actual.',
  },
  {
    keywords: ['bienvenida', 'empezar', 'inicio', 'que puedo hacer', 'funciones', 'usar fisiomirror', 'para que sirve'],
    question: '¿Qué puedo hacer en FisioMirror?',
    answer:
      'FisioMirror es una plataforma de fisioterapia que te permite:\n\n' +
      '- **Gestionar pacientes** y sus fichas clínicas.\n' +
      '- **Crear rutinas** de ejercicios personalizadas.\n' +
      '- Usar el **modo espejo AR** para guiar movimientos en tiempo real.\n' +
      '- **Escanear recetas** con OCR.\n' +
      '- **Generar informes PDF** de progreso.\n' +
      '- Realizar **videollamadas** con tus pacientes.\n' +
      '- Consultar **estadísticas** y **logros**.\n\n' +
      'Usa el menú flotante (FAB) para acceder rápido a las funciones principales.',
  },
  {
    keywords: ['recuperar', 'olvide', 'olvide contraseña', 'resetear', 'olvidé', 'no recuerdo', 'recuperar contraseña'],
    question: 'Olvidé mi contraseña, ¿qué hago?',
    answer:
      'Si olvidaste tu contraseña:\n\n' +
      '- En la pantalla de inicio pulsa **"Recuperar contraseña"**.\n' +
      '- Introduce tu correo electrónico.\n' +
      '- Te enviaremos un enlace para restablecerla (revisa spam si no lo ves).\n' +
      '- Abre el enlace y define una nueva contraseña.\n\n' +
      'Si no recibes el correo, escríbenos a **fisioMirror@proton.me**.',
  },
  {
    keywords: ['invitar', 'invitacion', 'enlace', 'compartir', 'paciente nuevo', 'vincular'],
    question: '¿Cómo invito a un paciente a la plataforma?',
    answer:
      'Para invitar a un paciente:\n\n' +
      '- En la ficha del paciente pulsa **"Invitar"**.\n' +
      '- Se generará un enlace único de acceso.\n' +
      '- Compártelo por correo o WhatsApp.\n' +
      '- El paciente se registra con ese enlace y queda vinculado a tu cuenta.\n\n' +
      'El nombre de tu clínica aparecerá en la invitación.',
  },
  {
    keywords: ['datos', 'seguridad', 'privacidad', 'proteccion', 'gdpr', 'informacion', 'almacenamiento'],
    question: '¿Cómo se protegen mis datos y los de mis pacientes?',
    answer:
      'FisioMirror protege la información así:\n\n' +
      '- **Cifrado** de datos en tránsito (HTTPS) y en reposo.\n' +
      '- **Row Level Security**: cada fisioterapeuta solo ve a sus propios pacientes.\n' +
      '- **Autenticación** con sesiones JWT seguras.\n' +
      '- Las imágenes de recetas se procesan y almacenan de forma privada.\n\n' +
      'Para más detalle consulta la política de privacidad o escríbenos a **fisioMirror@proton.me**.',
  },
];
