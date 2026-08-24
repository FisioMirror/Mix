import { useState, useEffect, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, FileText, Shield, Code2, Palette, Heart, BookOpen } from 'lucide-react';
import { useTheme, FONT_SIZE_LEVELS } from '../context/ThemeContext';
import { useAuthStore } from '../stores/authStore';
import { GlassPanel } from '../components/ui/Glass';
import { Icon } from '../components/ui/Icon';
import { AnimatedTabs } from '../components/ui/AnimatedTabs';
import { useGlassToast } from '../components/ui/GlassToast';
import { cn } from '../lib/utils';
import { supabaseUrl } from '../lib/supabase';

/* ── localStorage helpers ─────────────────────────────────────── */
function usePersistentBool(key: string, defaultValue: boolean) {
  const [value, setValue] = useState<boolean>(() => {
    const stored = localStorage.getItem(key);
    if (stored === null) return defaultValue;
    return stored === 'true';
  });
  useEffect(() => {
    localStorage.setItem(key, String(value));
  }, [key, value]);
  return [value, setValue] as const;
}

/* ── Toggle component ─────────────────────────────────────────── */
function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={cn('relative w-14 h-8 rounded-full transition-colors duration-300', value ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600')}
      aria-label={label}
      aria-checked={value}
      role="switch"
    >
      <motion.div
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className={cn('absolute top-1 w-6 h-6 rounded-full bg-white shadow-md', value ? 'left-7' : 'left-1')}
      />
    </button>
  );
}

/* ── Confirmation modal ───────────────────────────────────────── */
export function SettingsPage() {
  const { theme, toggleTheme, zoom, setZoom, fontSize, setFontSize, resetDefaults } = useTheme();
  const { user, signOut } = useAuthStore();
  const { show } = useGlassToast();

  /* ── Persistent settings ────────────────────────────────────── */
  const [reduceMotion, setReduceMotion] = usePersistentBool('fisio-reduce-motion', false);
  const [highContrast, setHighContrast] = usePersistentBool('fisio-high-contrast', false);
  const [talkback, setTalkback] = usePersistentBool('fisio-talkback', false);
  const [easyReading, setEasyReading] = usePersistentBool('fisio-easy-reading', false);
  const [largeTouch, setLargeTouch] = usePersistentBool('fisio-large-touch', false);
  const [glassmorphism, setGlassmorphism] = usePersistentBool('fisio-glassmorphism', true);
  const [notifEmail, setNotifEmail] = usePersistentBool('fisio-notif-email', true);
  const [notifPush, setNotifPush] = usePersistentBool('fisio-notif-push', true);
  const [notifSound, setNotifSound] = usePersistentBool('fisio-notif-sound', true);

  /* ── Confirmation modal state ───────────────────────────────── */
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDocModal, setShowDocModal] = useState(false);
  const [showLicModal, setShowLicModal] = useState(false);

  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  /* ── Apply classes to <html> ────────────────────────────────── */
  useEffect(() => {
    const cl = document.documentElement.classList;
    reduceMotion ? cl.add('reduce-motion') : cl.remove('reduce-motion');
  }, [reduceMotion]);

  useEffect(() => {
    const cl = document.documentElement.classList;
    highContrast ? cl.add('high-contrast') : cl.remove('high-contrast');
  }, [highContrast]);

  useEffect(() => {
    const cl = document.documentElement.classList;
    glassmorphism ? cl.remove('no-glass') : cl.add('no-glass');
  }, [glassmorphism]);

  useEffect(() => {
    const cl = document.documentElement.classList;
    talkback ? cl.add('talkback') : cl.remove('talkback');
  }, [talkback]);

  useEffect(() => {
    const cl = document.documentElement.classList;
    easyReading ? cl.add('easy-reading') : cl.remove('easy-reading');
  }, [easyReading]);

  useEffect(() => {
    const cl = document.documentElement.classList;
    largeTouch ? cl.add('large-touch') : cl.remove('large-touch');
  }, [largeTouch]);

  const zoomOptions = [80, 90, 100, 110, 120];

  /* ── Handlers ───────────────────────────────────────────────── */
  const handlePasswordChange = async () => {
    if (!pwCurrent || !pwNew || !pwConfirm) { show('Completa todos los campos', 'warning'); return; }
    if (pwNew !== pwConfirm) { show('Las contraseñas nuevas no coinciden', 'error'); return; }
    if (pwNew.length < 6) { show('La nueva contraseña debe tener al menos 6 caracteres', 'warning'); return; }
    setPwLoading(true);
    try {
      const fnUrl = `${supabaseUrl}/functions/v1`;
      const res = await fetch(`${fnUrl}/auth-update-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id, currentPassword: pwCurrent, newPassword: pwNew }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) { show(data.error || 'Error al cambiar la contraseña', 'error'); return; }
      show('Contraseña actualizada correctamente', 'success');
      setPwCurrent(''); setPwNew(''); setPwConfirm('');
      setShowPasswordModal(false);
    } catch { show('Error de conexión', 'error'); } finally { setPwLoading(false); }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) { show('Ingresa tu contraseña para confirmar', 'warning'); return; }
    setDeleteLoading(true);
    try {
      const fnUrl = `${supabaseUrl}/functions/v1`;
      const res = await fetch(`${fnUrl}/auth-delete-account`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id, password: deletePassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) { show(data.error || 'Error al eliminar la cuenta', 'error'); return; }
      show('Cuenta eliminada correctamente', 'success');
      signOut();
    } catch { show('Error de conexión', 'error'); } finally { setDeleteLoading(false); }
  };

  /* ══════════════════════════════════════════════════════════════
     APARIENCIA
     ══════════════════════════════════════════════════════════════ */
  const AparienciaTab: ReactNode = (
    <div className="space-y-4">
      {/* Tema claro / oscuro */}
      <GlassPanel className="p-6 rounded-2xl relative overflow-hidden">
        <div className="blob-teal absolute -top-12 -right-12 w-32 h-32 opacity-20 pointer-events-none" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', theme === 'light' ? 'bg-amber-100' : 'bg-slate-800')}>
              <Icon name={theme === 'light' ? 'light_mode' : 'dark_mode'} size={24} className={theme === 'light' ? 'text-amber-600' : 'text-slate-300'} />
            </div>
            <div>
              <p className="font-semibold text-on-surface">{theme === 'light' ? 'Modo Claro' : 'Modo Oscuro'}</p>
              <p className="text-sm text-on-surface-variant">Cambia entre tema claro y oscuro</p>
            </div>
          </div>
          <Toggle value={theme === 'dark'} onChange={toggleTheme} label="Cambiar tema" />
        </div>
      </GlassPanel>

      {/* Tamaño de fuente */}
      <GlassPanel className="p-6 rounded-2xl relative overflow-hidden">
        <div className="blob-blue absolute -top-12 -right-12 w-32 h-32 opacity-20 pointer-events-none" />
        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-on-surface gradient-text-blue">Tamaño de Tipografía</h3>
            <span className="font-bold text-primary">{fontSize}px</span>
          </div>
          <div className="flex gap-2 flex-wrap mb-4">
            {FONT_SIZE_LEVELS.map((size) => (
              <button
                key={size}
                onClick={() => setFontSize(size)}
                className={cn(
                  'px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 hover:scale-105 active:scale-95',
                  fontSize === size
                    ? 'bg-primary text-on-primary shadow-glow-primary breathe-teal'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
                )}
              >
                {size === 14 ? 'Pequeña' : size === 16 ? 'Normal' : size === 18 ? 'Grande' : 'Extra Grande'}
              </button>
            ))}
          </div>
          <div className="mt-4 p-4 rounded-xl bg-surface-container-low/60 border border-outline-variant/20">
            <p className="text-on-surface" style={{ fontSize: `${fontSize}px` }}>
              Texto de ejemplo: "Tu próxima sesión de rehabilitación es mañana a las 10:00."
            </p>
          </div>
        </div>
      </GlassPanel>

      {/* Zoom */}
      <GlassPanel className="p-6 rounded-2xl relative overflow-hidden">
        <div className="blob-cyan absolute -top-12 -right-12 w-32 h-32 opacity-20 pointer-events-none" />
        <div className="relative">
          <h3 className="font-semibold text-on-surface gradient-text-cyan mb-2">Zoom de Interfaz</h3>
          <p className="text-sm text-on-surface-variant mb-4">Amplía o reduce el tamaño de toda la interfaz</p>
          <div className="flex gap-2 flex-wrap">
            {zoomOptions.map((z) => (
              <button
                key={z}
                onClick={() => setZoom(z)}
                className={cn(
                  'px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 hover:scale-105 active:scale-95',
                  zoom === z
                    ? 'bg-primary text-on-primary shadow-glow-primary breathe-teal'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
                )}
              >
                {z}%
              </button>
            ))}
          </div>
          <button
            onClick={resetDefaults}
            className="mt-4 w-full py-2.5 rounded-xl bg-surface-container-low text-on-surface-variant font-semibold text-sm hover:bg-surface-container-high transition-colors border border-outline-variant/20 flex items-center justify-center gap-2"
          >
            <Icon name="restart_alt" size={18} /> Restablecer predeterminados (100% / 16px)
          </button>
        </div>
      </GlassPanel>

      {/* Glassmorfismo */}
      <GlassPanel className="p-6 rounded-2xl relative overflow-hidden">
        <div className="blob-emerald absolute -top-12 -right-12 w-32 h-32 opacity-20 pointer-events-none" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Icon name="gradient" size={24} className="icon-accent-emerald" />
            </div>
            <div>
              <p className="font-semibold text-on-surface">Glassmorfismo</p>
              <p className="text-sm text-on-surface-variant">Efectos de vidrio esmerilado en las superficies</p>
            </div>
          </div>
          <Toggle value={glassmorphism} onChange={setGlassmorphism} label="Glassmorfismo" />
        </div>
      </GlassPanel>
    </div>
  );

  /* ══════════════════════════════════════════════════════════════
     ACCESIBILIDAD
     ══════════════════════════════════════════════════════════════ */
  const AccesibilidadTab: ReactNode = (
    <div className="space-y-4">
      {[
        {
          key: 'motion',
          icon: 'animation',
          color: 'text-primary',
          bg: 'bg-primary/10',
          title: 'Reducir Movimiento',
          desc: 'Minimiza animaciones y efectos visuales para mayor comodidad',
          value: reduceMotion,
          onChange: setReduceMotion,
          blob: 'blob-teal',
        },
        {
          key: 'contrast',
          icon: 'contrast',
          color: 'text-secondary',
          bg: 'bg-secondary-container/20',
          title: 'Alto Contraste',
          desc: 'Aumenta el contraste de textos y bordes para mejor legibilidad',
          value: highContrast,
          onChange: setHighContrast,
          blob: 'blob-blue',
        },
        {
          key: 'talkback',
          icon: 'record_voice_over',
          color: 'icon-accent-cyan',
          bg: 'bg-cyan-500/10',
          title: 'Lectura en Voz Alta (Talkback)',
          desc: 'Lee en voz alta los mensajes de Physi y textos importantes',
          value: talkback,
          onChange: setTalkback,
          blob: 'blob-cyan',
        },
        {
          key: 'easyReading',
          icon: 'menu_book',
          color: 'icon-accent-emerald',
          bg: 'bg-emerald-500/10',
          title: 'Lectura Fácil',
          desc: 'Aumenta el tamaño de texto y espaciado en secciones clave',
          value: easyReading,
          onChange: setEasyReading,
          blob: 'blob-emerald',
        },
        {
          key: 'largeTouch',
          icon: 'touch_app',
          color: 'text-primary',
          bg: 'bg-primary/10',
          title: 'Botones Táctiles Grandes',
          desc: 'Asegura que los botones tengan al menos 48px para fácil toque',
          value: largeTouch,
          onChange: setLargeTouch,
          blob: 'blob-teal',
        },
      ].map((item) => (
        <GlassPanel key={item.key} className="p-6 rounded-2xl relative overflow-hidden">
          <div className={`${item.blob} absolute -top-12 -right-12 w-32 h-32 opacity-20 pointer-events-none`} />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl ${item.bg} flex items-center justify-center`}>
                <Icon name={item.icon} size={24} className={item.color} />
              </div>
              <div>
                <p className="font-semibold text-on-surface">{item.title}</p>
                <p className="text-sm text-on-surface-variant">{item.desc}</p>
              </div>
            </div>
            <Toggle value={item.value} onChange={item.onChange} label={item.title} />
          </div>
        </GlassPanel>
      ))}
    </div>
  );

  /* ══════════════════════════════════════════════════════════════
     NOTIFICACIONES
     ══════════════════════════════════════════════════════════════ */
  const NotificacionesTab: ReactNode = (
    <GlassPanel className="p-6 rounded-2xl relative overflow-hidden">
      <div className="blob-cyan absolute -top-12 -right-12 w-32 h-32 opacity-20 pointer-events-none" />
      <div className="relative space-y-5">
        <h3 className="font-semibold text-on-surface gradient-text-cyan">Preferencias de Notificaciones</h3>
        {[
          { icon: 'mail', color: 'text-primary', bg: 'bg-primary/10', title: 'Notificaciones por Email', desc: 'Recibe actualizaciones y recordatorios en tu correo', value: notifEmail, onChange: setNotifEmail },
          { icon: 'notifications_active', color: 'text-secondary', bg: 'bg-secondary-container/20', title: 'Notificaciones Push', desc: 'Recibe alertas en tiempo real en tu dispositivo', value: notifPush, onChange: setNotifPush },
          { icon: 'volume_up', color: 'icon-accent-cyan', bg: 'bg-cyan-500/10', title: 'Sonido', desc: 'Reproduce un sonido al recibir notificaciones', value: notifSound, onChange: setNotifSound },
        ].map((item) => (
          <div key={item.title} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl ${item.bg} flex items-center justify-center`}>
                <Icon name={item.icon} size={22} className={item.color} />
              </div>
              <div>
                <p className="font-medium text-on-surface">{item.title}</p>
                <p className="text-sm text-on-surface-variant">{item.desc}</p>
              </div>
            </div>
            <Toggle value={item.value} onChange={item.onChange} label={item.title} />
          </div>
        ))}
      </div>
    </GlassPanel>
  );

  /* ══════════════════════════════════════════════════════════════
     CUENTA
     ══════════════════════════════════════════════════════════════ */
  const CuentaTab: ReactNode = (
    <div className="space-y-4">
      {/* Información de cuenta */}
      <GlassPanel className="p-6 rounded-2xl relative overflow-hidden">
        <div className="blob-teal absolute -top-12 -right-12 w-32 h-32 opacity-20 pointer-events-none" />
        <div className="relative">
          <h3 className="font-semibold text-on-surface gradient-text-teal mb-4">Información de Cuenta</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low/60">
              <div className="flex items-center gap-2 text-on-surface-variant"><Icon name="alternate_email" size={18} /><span className="text-sm">Email</span></div>
              <span className="font-medium text-on-surface text-sm">{user?.email || '—'}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low/60">
              <div className="flex items-center gap-2 text-on-surface-variant"><Icon name="badge" size={18} /><span className="text-sm">Rol</span></div>
              <span className="font-medium text-on-surface text-sm capitalize">{user?.role || '—'}</span>
            </div>
          </div>
        </div>
      </GlassPanel>

      {/* Seguridad */}
      <GlassPanel className="p-6 rounded-2xl relative overflow-hidden">
        <div className="blob-blue absolute -top-12 -right-12 w-32 h-32 opacity-20 pointer-events-none" />
        <div className="relative">
          <h3 className="font-semibold text-on-surface gradient-text-blue mb-4">Seguridad</h3>
          <button
            onClick={() => setShowPasswordModal(true)}
            className="premium-btn w-full bg-primary text-on-primary py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
          >
            <Icon name="lock_reset" size={20} />Cambiar Contraseña
          </button>
        </div>
      </GlassPanel>

      {/* Zona de peligro */}
      <GlassPanel className="p-6 rounded-2xl relative overflow-hidden border border-error/20">
        <div className="blob-warm absolute -top-12 -right-12 w-32 h-32 opacity-15 pointer-events-none" />
        <div className="relative">
          <h3 className="font-semibold text-error mb-2">Zona de Peligro</h3>
          <p className="text-sm text-on-surface-variant mb-4">Estas acciones son permanentes y no se pueden deshacer</p>
          <div className="space-y-3">
            <button
              onClick={() => setShowDeleteModal(true)}
              className="premium-btn w-full bg-error/10 text-error py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-error/20 transition-colors border border-error/20"
            >
              <Icon name="delete_forever" size={20} />Eliminar Cuenta
            </button>
            <button
              onClick={() => signOut()}
              className="premium-btn w-full bg-surface-container-low text-on-surface-variant py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-surface-container-high transition-colors"
            >
              <Icon name="logout" size={20} />Cerrar Sesión
            </button>
          </div>
        </div>
      </GlassPanel>
    </div>
  );

  /* ══════════════════════════════════════════════════════════════
     ACERCA DE
     ══════════════════════════════════════════════════════════════ */
  const AcercaDeTab: ReactNode = (
    <div className="space-y-4">
      {/* Versión */}
      <GlassPanel className="p-6 rounded-2xl relative overflow-hidden">
        <div className="blob-teal absolute -top-12 -right-12 w-32 h-32 opacity-20 pointer-events-none" />
        <div className="relative flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center breathe-teal">
            <Icon name="favorite" size={28} className="text-primary" filled />
          </div>
          <div>
            <h3 className="text-xl font-bold text-on-surface">FisioMirror</h3>
            <p className="text-sm text-on-surface-variant">Versión: <span className="font-semibold text-primary">v2.0 – Prototipo</span></p>
          </div>
        </div>
      </GlassPanel>

      {/* Créditos del equipo */}
      <GlassPanel className="p-6 rounded-2xl relative overflow-hidden">
        <div className="blob-cyan absolute -top-12 -right-12 w-32 h-32 opacity-20 pointer-events-none" />
        <div className="relative">
          <h3 className="font-semibold text-on-surface gradient-text-cyan mb-4">Créditos del Equipo</h3>
          <div className="space-y-3">
            {[
              { icon: Code2, color: 'text-primary', bg: 'bg-primary/10', label: 'Equipo Desarrollador', value: '4 tazas de café y 2 horas de sueño durante un mes.' },
              { icon: Palette, color: 'text-cyan-600', bg: 'bg-cyan-500/10', label: 'Equipo de Diseño', value: 'Dios y yo.' },
              { icon: Heart, color: 'text-emerald-600', bg: 'bg-emerald-500/10', label: 'Equipo Clínico', value: 'Todas y cada una de las personas que nos han apoyado con su conocimiento profesional hasta este punto, y Dios.' },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-3 p-3 rounded-xl bg-surface-container-low/60">
                <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center shrink-0`}>
                  <item.icon size={20} className={item.color} />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-on-surface text-sm">{item.label}</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </GlassPanel>

      {/* Enlaces */}
      <GlassPanel className="p-6 rounded-2xl relative overflow-hidden">
        <div className="blob-emerald absolute -top-12 -right-12 w-32 h-32 opacity-20 pointer-events-none" />
        <div className="relative space-y-3">
          <h3 className="font-semibold text-on-surface gradient-text-emerald mb-2">Recursos</h3>
          <button
            onClick={() => setShowDocModal(true)}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-surface-container-low/60 hover:bg-surface-container-high transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <FileText size={20} className="text-primary" />
              </div>
              <div className="text-left">
                <p className="font-medium text-on-surface text-sm">Documentación Técnica</p>
                <p className="text-xs text-on-surface-variant">Arquitectura y tecnologías del sistema</p>
              </div>
            </div>
            <Icon name="chevron_right" size={20} className="text-on-surface-variant group-hover:text-primary transition-colors" />
          </button>
          <button
            onClick={() => setShowLicModal(true)}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-surface-container-low/60 hover:bg-surface-container-high transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                <Shield size={20} className="text-cyan-600" />
              </div>
              <div className="text-left">
                <p className="font-medium text-on-surface text-sm">Licencias de Código Abierto</p>
                <p className="text-xs text-on-surface-variant">Librerías utilizadas y sus licencias</p>
              </div>
            </div>
            <Icon name="chevron_right" size={20} className="text-on-surface-variant group-hover:text-primary transition-colors" />
          </button>
        </div>
      </GlassPanel>
    </div>
  );

  /* ══════════════════════════════════════════════════════════════
     CONTACTO
     ══════════════════════════════════════════════════════════════ */
  const ContactoTab: ReactNode = (
    <GlassPanel className="p-6 rounded-2xl relative overflow-hidden">
      <div className="blob-teal absolute -top-12 -right-12 w-32 h-32 opacity-20 pointer-events-none" />
      <div className="relative">
        <h3 className="font-semibold text-on-surface gradient-text-teal mb-2">Contacto</h3>
        <p className="text-sm text-on-surface-variant mb-6">
          ¿Tienes preguntas, sugerencias o necesitas ayuda? Escríbenos y te responderemos lo antes posible.
        </p>
        <a
          href="mailto:fisioMirror@proton.me"
          className="premium-btn inline-flex items-center gap-3 px-6 py-3.5 rounded-xl font-semibold bg-primary text-on-primary hover:bg-primary/90 transition-colors shadow-glow-primary breathe-teal"
        >
          <Mail size={22} />
          Enviar Correo Electrónico
        </a>
        <div className="mt-6 p-4 rounded-xl bg-surface-container-low/60 border border-outline-variant/20">
          <div className="flex items-center gap-2 text-on-surface-variant">
            <Icon name="mail" size={18} />
            <span className="text-sm">fisioMirror@proton.me</span>
          </div>
        </div>
      </div>
    </GlassPanel>
  );

  const tabs = [
    { id: 'apariencia', label: 'Apariencia', content: AparienciaTab },
    { id: 'accesibilidad', label: 'Accesibilidad', content: AccesibilidadTab },
    { id: 'notificaciones', label: 'Notificaciones', content: NotificacionesTab },
    { id: 'cuenta', label: 'Cuenta', content: CuentaTab },
    { id: 'acerca-de', label: 'Acerca de', content: AcercaDeTab },
    { id: 'contacto', label: 'Contacto', content: ContactoTab },
  ];

  return (
    <div className="space-y-6 overflow-x-hidden">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center breathe-teal">
          <Icon name="settings" size={28} className="text-primary animate-breathe-icon" />
        </div>
        <div>
          <h1 className="text-headline-lg-mobile lg:text-headline-lg font-bold gradient-text-editorial">Configuración</h1>
          <p className="text-on-surface-variant text-sm">Personaliza tu experiencia en FisioMirror</p>
        </div>
      </motion.div>

      <AnimatedTabs tabs={tabs} />

      {/* Modales de confirmación */}
      {/* Modal: Cambiar contraseña */}
      <AnimatePresence>
        {showPasswordModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setShowPasswordModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-surface rounded-2xl p-6 w-full max-w-md shadow-2xl border border-outline-variant/20"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-on-surface mb-4">Cambiar Contraseña</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-on-surface-variant mb-1 block">Contraseña actual</label>
                  <input
                    type="password" value={pwCurrent} onChange={(e) => setPwCurrent(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface focus:outline-none focus:border-primary transition-colors"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-on-surface-variant mb-1 block">Nueva contraseña</label>
                  <input
                    type="password" value={pwNew} onChange={(e) => setPwNew(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface focus:outline-none focus:border-primary transition-colors"
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-on-surface-variant mb-1 block">Confirmar nueva contraseña</label>
                  <input
                    type="password" value={pwConfirm} onChange={(e) => setPwConfirm(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface focus:outline-none focus:border-primary transition-colors"
                    placeholder="••••••••"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowPasswordModal(false)} className="flex-1 py-3 rounded-xl bg-surface-container-low text-on-surface-variant font-semibold hover:bg-surface-container-high transition-colors">Cancelar</button>
                <button onClick={handlePasswordChange} disabled={pwLoading} className="flex-1 py-3 rounded-xl bg-primary text-on-primary font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50">{pwLoading ? 'Guardando...' : 'Guardar'}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal: Eliminar cuenta */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setShowDeleteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-surface rounded-2xl p-6 w-full max-w-md shadow-2xl border border-error/20"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-error/10 flex items-center justify-center">
                  <Icon name="warning" size={24} className="text-error" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-error">Eliminar Cuenta</h3>
                  <p className="text-sm text-on-surface-variant">Esta acción no se puede deshacer</p>
                </div>
              </div>
              <p className="text-sm text-on-surface-variant mb-4">Se desactivará tu cuenta y se eliminarán todos tus datos, historial de sesiones y configuraciones.</p>
              <div>
                <label className="text-sm font-medium text-on-surface-variant mb-1 block">Confirma con tu contraseña</label>
                <input
                  type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface focus:outline-none focus:border-error transition-colors"
                  placeholder="••••••••"
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-3 rounded-xl bg-surface-container-low text-on-surface-variant font-semibold hover:bg-surface-container-high transition-colors">Cancelar</button>
                <button onClick={handleDeleteAccount} disabled={deleteLoading} className="flex-1 py-3 rounded-xl bg-error text-white font-semibold hover:bg-error/90 transition-colors disabled:opacity-50">{deleteLoading ? 'Eliminando...' : 'Eliminar definitivamente'}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal: Documentación técnica */}
      <AnimatePresence>
        {showDocModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setShowDocModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-surface rounded-2xl p-6 w-full max-w-2xl shadow-2xl border border-outline-variant/20 max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <BookOpen size={24} className="text-primary" />
                </div>
                <h3 className="text-lg font-bold text-on-surface">Documentación Técnica</h3>
              </div>
              <div className="space-y-4 text-sm text-on-surface-variant leading-relaxed">
                <div>
                  <h4 className="font-semibold text-on-surface mb-1">Arquitectura del Sistema</h4>
                  <p>FisioMirror es una aplicación web progresiva (PWA) construida con una arquitectura cliente-servidor. El frontend utiliza React 18 con TypeScript, renderizado con Vite. El backend utiliza Supabase (PostgreSQL) para persistencia de datos, autenticación y funciones serverless (Edge Functions en Deno).</p>
                </div>
                <div>
                  <h4 className="font-semibold text-on-surface mb-1">Tecnologías Principales</h4>
                  <ul className="list-disc list-inside space-y-1">
                    <li>React 18 + TypeScript + Vite</li>
                    <li>Tailwind CSS para estilos</li>
                    <li>Supabase (PostgreSQL, Auth, Edge Functions, Storage)</li>
                    <li>MediaPipe Pose Detection para análisis de movimiento</li>
                    <li>Framer Motion para animaciones</li>
                    <li>HTML2Canvas + jsPDF para generación de PDFs</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-on-surface mb-1">Flujos Principales</h4>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Autenticación: Email/contraseña y tokens de activación para pacientes.</li>
                    <li>Calibración biométrica: Detección de pose con MediaPipe para ángulos articulares.</li>
                    <li>Espejo AR: Realidad aumentada con feedback en tiempo real.</li>
                    <li>Generación de informes: PDFs estilizados con narrativa generada por IA.</li>
                  </ul>
                </div>
              </div>
              <button onClick={() => setShowDocModal(false)} className="w-full mt-6 py-3 rounded-xl bg-primary text-on-primary font-semibold hover:bg-primary/90 transition-colors">Cerrar</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal: Licencias */}
      <AnimatePresence>
        {showLicModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setShowLicModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-surface rounded-2xl p-6 w-full max-w-2xl shadow-2xl border border-outline-variant/20 max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                  <Shield size={24} className="text-cyan-600" />
                </div>
                <h3 className="text-lg font-bold text-on-surface">Licencias de Código Abierto</h3>
              </div>
              <div className="space-y-2">
                {[
                  { name: 'React', version: '18.3.1', license: 'MIT' },
                  { name: 'TypeScript', version: '5.5.3', license: 'Apache 2.0' },
                  { name: 'Vite', version: '5.4.0', license: 'MIT' },
                  { name: 'Tailwind CSS', version: '3.4.0', license: 'MIT' },
                  { name: 'Supabase JS', version: '2.45.0', license: 'MIT' },
                  { name: 'MediaPipe Tasks Vision', version: '0.10.0', license: 'Apache 2.0' },
                  { name: 'Framer Motion', version: '11.3.0', license: 'MIT' },
                  { name: 'Lucide React', version: '0.400.0', license: 'ISC' },
                  { name: 'jsPDF', version: '2.5.1', license: 'MIT' },
                  { name: 'HTML2Canvas', version: '1.4.1', license: 'MIT' },
                  { name: 'Recharts', version: '2.12.0', license: 'MIT' },
                  { name: 'Zustand', version: '4.5.0', license: 'MIT' },
                  { name: 'Canvas Confetti', version: '1.9.0', license: 'ISC' },
                ].map((lib) => (
                  <div key={lib.name} className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low/60">
                    <div className="flex items-center gap-3">
                      <Code2 size={18} className="text-on-surface-variant" />
                      <div>
                        <p className="font-medium text-on-surface text-sm">{lib.name}</p>
                        <p className="text-xs text-on-surface-variant">v{lib.version}</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">{lib.license}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => setShowLicModal(false)} className="w-full mt-6 py-3 rounded-xl bg-primary text-on-primary font-semibold hover:bg-primary/90 transition-colors">Cerrar</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
