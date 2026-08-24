import { type ReactNode, useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, Phone, MessageCircle, Mail } from 'lucide-react';
import { Icon } from './ui/Icon';
import { BackButton } from './ui/BackButton';

import { FloatingMenu, type FloatingMenuItem } from './ui/FloatingMenu';
import { PhysiGuide } from './ui/PhysiGuide';
import { HelpGuideButton } from './ui/HelpGuideButton';
import { LegalModal, type LegalDocType } from './ui/LegalModal';
import { useAuthStore } from '../stores/authStore';
import { useTheme } from '../context/ThemeContext';
import { useToast } from './ui/ToastProvider';
import { supabase } from '../lib/supabase';
import { cn, timeAgo } from '../lib/utils';
import MascotAnimation from './ui/MascotAnimation';

const primaryNavItems = [
  { to: '/dashboard-paciente', label: 'Inicio', icon: 'home', accent: 'teal' },
  { to: '/exercises', label: 'Ejercicios', icon: 'fitness_center', accent: 'cyan' },
  { to: '/stats', label: 'Progreso', icon: 'leaderboard', accent: 'emerald' },
  { to: '/ai-assistant', label: 'Physi', icon: 'smart_toy', accent: 'blue' },
];

const secondaryNavItems = [
  { to: '/profile', label: 'Perfil', icon: 'person', accent: 'teal' },
  { to: '/settings', label: 'Configuración', icon: 'settings', accent: 'teal' },
];

const navItems = [...primaryNavItems, ...secondaryNavItems];

const breadcrumbMap: Record<string, string> = {
  '/dashboard-paciente': 'Inicio',
  '/exercises': 'Ejercicios',
  '/stats': 'Progreso',
  '/ai-assistant': 'Physi',
  '/profile': 'Perfil',
  '/settings': 'Configuración',
};

interface PatientLayoutProps {
  children: ReactNode;
}

interface Notif {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  created_at: string;
}

export function PatientLayout({ children }: PatientLayoutProps) {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const { theme, toggleTheme } = useTheme();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [showLogout, setShowLogout] = useState(false);
  const [legalModal, setLegalModal] = useState<LegalDocType | null>(null);
  const [therapistPhone, setTherapistPhone] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('patient-sidebar-collapsed') === 'true');
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    localStorage.setItem('patient-sidebar-collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const sidebarWidth = sidebarCollapsed ? 64 : 256;
  const currentCrumb = breadcrumbMap[location.pathname] || 'Inicio';

  useEffect(() => {
    loadTherapistPhone();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    loadNotifications();
    fetchUnreadCount();
    const channel = supabase
      .channel('patient-notifications-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => { loadNotifications(); fetchUnreadCount(); },
      )
      .subscribe();
    // Polling fallback: refresh every 30s in case realtime misses an event
    const pollInterval = setInterval(() => {
      loadNotifications();
      fetchUnreadCount();
    }, 30_000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!showNotifications || !user?.id || unreadCount === 0) return;
    const markRead = async () => {
      await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false);
      setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    };
    markRead();
  }, [showNotifications, user?.id]);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const loadNotifications = async () => {
    if (!user?.id) return;
    try {
      const { data } = await supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20);
      if (data) setNotifs(data as Notif[]);
    } catch { /* keep empty */ }
  };

  const fetchUnreadCount = async () => {
    if (!user?.id) return;
    try {
      const { count } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('read', false);
      setUnreadCount(count ?? 0);
    } catch { /* keep current */ }
  };

  const loadTherapistPhone = async () => {
    if (!user?.id) return;
    try {
      const { data: link } = await supabase
        .from('pacientes_terapeutas')
        .select('terapeuta_id')
        .eq('paciente_id', user.id)
        .maybeSingle();
      if (link?.terapeuta_id) {
        const { data: fisio } = await supabase
          .from('fisioterapeutas_simple')
          .select('telefono')
          .eq('id', link.terapeuta_id)
          .maybeSingle();
        if (fisio?.telefono) setTherapistPhone(fisio.telefono);
      }
    } catch {
      // phone unavailable
    }
    if (!therapistPhone) setTherapistPhone('+584124081077');
  };

  const handleSignOut = () => {
    signOut();
    toast.info('Sesión cerrada');
    navigate('/login');
  };

  const notifIcon = (type: string): string => {
    if (type === 'videollamada') return 'videocam';
    if (type === 'rutina') return 'fitness_center';
    if (type === 'sistema') return 'info';
    return 'notifications';
  };

  const markAllRead = async () => {
    if (!user?.id) return;
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false);
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    toast.info('Notificaciones marcadas como leídas');
  };

  const handleJoinNotif = async (notif: Notif) => {
    if (notif.link) window.open(notif.link, '_blank');
    await supabase.from('notifications').update({ read: true }).eq('id', notif.id);
    setNotifs((prev) => prev.map((n) => n.id === notif.id ? { ...n, read: true } : n));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const quickActionItems: FloatingMenuItem[] = [
    {
      label: 'Videollamada',
      icon: <Video size={20} className="text-primary" />,
      onClick: async () => {
        if (!user?.id) { toast.info('No hay sesión activa'); return; }
        try {
          const { data: vinculacion } = await supabase
            .from('pacientes_terapeutas')
            .select('terapeuta_id')
            .eq('paciente_id', user.id)
            .maybeSingle();
          if (!vinculacion?.terapeuta_id) {
            toast.error('No tienes un fisioterapeuta asignado');
            return;
          }
          const fisioId = vinculacion.terapeuta_id;
          const jitsiUrl = `https://meet.jit.si/FisioMirror-${user.id}-${fisioId}`;
          window.open(jitsiUrl, '_blank');
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
          const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
          const notifRes = await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseAnonKey}`,
            },
            body: JSON.stringify({
              fisio_id: fisioId,
              type: 'videollamada',
              title: 'Videollamada entrante',
              message: `${user.full_name || 'Tu paciente'} quiere iniciar una videollamada`,
              link: jitsiUrl,
            }),
          });
          if (!notifRes.ok) {
            console.warn('send-notification falló', notifRes.status);
          }
          toast.success('Videollamada iniciada. Tu fisioterapeuta ha sido notificado.');
        } catch {
          toast.error('No se pudo iniciar la videollamada');
        }
      },
    },
    {
      label: 'Llamada',
      icon: <Phone size={20} className="text-primary" />,
      onClick: () => {
        if (therapistPhone) {
          window.location.href = `tel:${therapistPhone}`;
        } else {
          toast.info('No hay número de teléfono registrado');
        }
      },
    },
    {
      label: 'WhatsApp',
      icon: <MessageCircle size={20} className="text-primary" />,
      onClick: () => {
        if (therapistPhone) {
          const clean = therapistPhone.replace(/\D/g, '');
          window.open(`https://wa.me/${clean}`, '_blank');
        } else {
          toast.info('No hay número de WhatsApp registrado');
        }
      },
    },
    {
      label: 'Mensaje',
      icon: <Mail size={20} className="text-primary" />,
      onClick: () => {
        if (therapistPhone) {
          window.location.href = `sms:${therapistPhone}`;
        } else {
          toast.info('No hay número de teléfono registrado');
        }
      },
    },
  ];

  const sidebarContent = (collapsed: boolean, opts?: { onNavigate?: () => void; showToggle?: boolean }) => (
    <>
      <div className="flex items-center px-5 h-16 border-b border-teal-100 dark:border-slate-700 shrink-0 relative">
        {!collapsed ? (
          <div className="flex items-center gap-2 min-w-0">
            <img src="/logo.png" alt="" className="h-10 w-auto shrink-0" />
            <h1 className="font-headline-lg-mobile text-headline-lg-mobile gradient-text-editorial tracking-tight leading-none truncate">FisioMirror</h1>
          </div>
        ) : (
          <img src="/logo.png" alt="" className="h-9 w-auto" />
        )}
        {opts?.showToggle && (
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            aria-label={sidebarCollapsed ? 'Expandir menú' : 'Colapsar menú'}
            className="hidden lg:flex absolute top-5 right-2 w-6 h-6 rounded-full bg-primary text-on-primary items-center justify-center text-xs shadow-md hover:scale-110 transition-transform z-10"
          >
            <Icon name={sidebarCollapsed ? 'chevron_right' : 'chevron_left'} size={14} />
          </button>
        )}
      </div>
      <nav className="flex-1 flex flex-col gap-1 p-2 overflow-y-auto overflow-x-hidden">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={opts?.onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center rounded-2xl transition-all',
                collapsed ? 'justify-center px-2 py-3' : 'gap-3 px-4 py-3',
                isActive
                  ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 font-bold'
                  : 'text-gray-700 dark:text-gray-200 font-medium hover:bg-teal-50/60 dark:hover:bg-slate-700/60'
              )
            }
            title={collapsed ? item.label : undefined}
          >
            <Icon name={item.icon} filled={true} size={24} className={cn('shrink-0', location.pathname === item.to && `icon-accent-${item.accent}`)} />
            {!collapsed && <span className="text-sm">{item.label}</span>}
          </NavLink>
        ))}
      </nav>
      <div className={cn('shrink-0 border-t border-teal-100 dark:border-slate-700 p-3', collapsed ? 'flex flex-col items-center gap-2' : 'space-y-3')}>
        {!collapsed && (
          <div className="rounded-2xl bg-teal-50 dark:bg-slate-700 p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-bold text-sm overflow-hidden shrink-0">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                user?.full_name?.charAt(0) || 'P'
              )}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm text-gray-900 dark:text-gray-100 truncate">{user?.full_name || 'Paciente'}</p>
              <p className="text-[10px] text-teal-600 dark:text-teal-400 uppercase tracking-wider">Paciente</p>
            </div>
          </div>
        )}
        <div className={cn(collapsed ? 'flex flex-col items-center gap-2' : 'flex items-center justify-center gap-2')}>
          <button
            onClick={() => { opts?.onNavigate?.(); setShowNotifications((v) => !v); }}
            className="relative p-2 rounded-full text-gray-700 dark:text-gray-200 hover:bg-teal-50 dark:hover:bg-slate-700 hover:text-teal-700 dark:hover:text-teal-300 transition-colors"
            aria-label={`Notificaciones, ${unreadCount} sin leer`}
          >
            <Icon name="notifications" size={22} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] bg-red-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center px-1">{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </button>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full text-gray-700 dark:text-gray-200 hover:bg-teal-50 dark:hover:bg-slate-700 hover:text-teal-700 dark:hover:text-teal-300 transition-colors"
            aria-label="Cambiar tema"
          >
            <Icon name={theme === 'dark' ? 'light_mode' : 'dark_mode'} size={22} />
          </button>
          <button
            onClick={() => { opts?.onNavigate?.(); setShowLogout(true); }}
            className="p-2 rounded-full text-gray-700 dark:text-gray-200 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            aria-label="Cerrar sesión"
          >
            <Icon name="logout" size={22} />
          </button>
        </div>
      </div>
    </>
  );

  const desktopSidebar = (
    <aside
      className="fixed left-0 top-0 h-screen z-40 flex flex-col bg-teal-50/40 dark:bg-slate-900 border-r border-teal-200/40 dark:border-teal-800/30 text-gray-900 dark:text-gray-200 transition-all duration-300 overflow-hidden"
      style={{ width: `${sidebarWidth}px` }}
    >
      {sidebarContent(sidebarCollapsed, { showToggle: true })}
    </aside>
  );

  return (
    <div className="flex flex-col lg:flex-row h-screen overflow-hidden bg-background text-on-surface" style={{ ['--patient-sidebar-w' as string]: `${sidebarWidth}px` }}>
      {/* Desktop sidebar navigation */}
      <div className="hidden lg:block">{desktopSidebar}</div>

      {/* Mobile sidebar drawer (slide-in from left) */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          >
            <motion.div
              initial={{ x: -256 }}
              animate={{ x: 0 }}
              exit={{ x: -256 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="h-screen w-64 flex flex-col bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-r border-teal-100 dark:border-slate-700 text-gray-900 dark:text-gray-100 lg:hidden"
            >
              {sidebarContent(false, { onNavigate: () => setSidebarOpen(false) })}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content area with sticky header */}
      <main className="flex-1 flex flex-col overflow-hidden lg:ml-[var(--patient-sidebar-w)]" data-scroll-root>
        {/* Sticky header — mobile (hamburger + title + actions) and desktop (breadcrumb + actions) */}
        <header className="glass-panel sticky top-0 z-30 flex items-center justify-between px-3 sm:px-6 h-16 border-b divider-teal shrink-0">
          {/* Left: hamburger (mobile) + breadcrumb (desktop) */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Abrir menú"
              className="lg:hidden text-primary shrink-0 p-2 rounded-full hover:bg-primary/10 transition-colors"
            >
              <Icon name="menu" size={24} />
            </button>
            <BackButton />
            {/* Mobile title */}
            <img src="/logo.png" alt="" className="lg:hidden h-9 w-auto shrink-0" />
            {/* Desktop breadcrumb */}
            <div className="hidden lg:flex items-center text-outline text-label-sm gap-2">
              <span className="hover:text-primary cursor-pointer">Inicio</span>
              <Icon name="chevron_right" size={14} />
              <span className="text-on-surface font-bold">{currentCrumb}</span>
            </div>
          </div>
          {/* Right: actions — all 4 buttons directly in header */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <div className={`online-indicator is-${isOnline ? 'online' : 'offline'} hidden sm:flex`}>
              <span className="dot" />
              <span>{isOnline ? 'Online' : 'Offline'}</span>
            </div>
            <button
              onClick={() => setShowNotifications((v) => !v)}
              className="relative text-on-surface-variant hover:text-primary transition-colors active-scale p-2 rounded-full"
              aria-label={`Notificaciones, ${unreadCount} sin leer`}
            >
              <Icon name="notifications" size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] bg-error rounded-full text-white text-[9px] font-bold flex items-center justify-center px-1">{unreadCount > 9 ? '9+' : unreadCount}</span>
              )}
            </button>
            <button
              onClick={toggleTheme}
              className="text-on-surface-variant hover:text-primary transition-colors active-scale p-2 rounded-full"
              aria-label="Cambiar tema"
            >
              <Icon name={theme === 'dark' ? 'light_mode' : 'dark_mode'} size={20} />
            </button>
            <HelpGuideButton />
            <PhysiGuide />
            <button
              onClick={() => setShowLogout(true)}
              className="text-on-surface-variant hover:text-error transition-colors active-scale p-2 rounded-full"
              aria-label="Cerrar sesión"
            >
              <Icon name="logout" size={20} />
            </button>
          </div>
        </header>
        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 pt-8 space-y-8 max-w-md mx-auto lg:px-0 lg:max-w-none lg:mx-0 lg:p-10 bg-teal-50/20 dark:bg-slate-950/20">{children}</div>

        {/* Desktop footer */}
        <footer className="hidden lg:flex pt-6 pb-6 px-8 justify-between text-outline text-xs border-t divider-teal shrink-0">
          <span>&copy; 2025 FisioMirror</span>
          <div className="flex gap-4">
            <button onClick={() => setLegalModal('consent')} className="transition-colors hover:text-primary">Consentimiento Informado</button>
            <button onClick={() => setLegalModal('terms')} className="transition-colors hover:text-primary">Términos de Servicio</button>
            <button onClick={() => setLegalModal('privacy')} className="transition-colors hover:text-primary">Privacidad de Datos</button>
          </div>
        </footer>
      </main>

      {/* Botón de acción flotante — oculto en la página de chat de Physi para mantener la vista limpia */}
      {location.pathname !== '/ai-assistant' && (
        <FloatingMenu
          items={quickActionItems}
          ariaLabel="Acciones del paciente"
          className="fixed bottom-24 right-4 z-50 lg:bottom-8 lg:right-8 pb-[env(safe-area-inset-bottom)]"
        />
      )}

      {/* Notification dropdown — animated with framer-motion */}
      <AnimatePresence>
        {showNotifications && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowNotifications(false)}
            className="fixed inset-0 z-[90]"
          >
            <motion.div
              initial={{ opacity: 0, x: 20, y: -10 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, x: 20, y: -10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="fixed top-20 right-4 lg:top-4 lg:right-4 w-80 max-w-[calc(100vw-2rem)] glass-panel rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b divider-teal">
                <h3 className="font-bold text-sm text-on-surface">Notificaciones</h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && <button onClick={markAllRead} className="text-xs text-primary font-bold hover:underline">Marcar todas</button>}
                  <button onClick={() => setShowNotifications(false)} aria-label="Cerrar notificaciones" className="text-outline hover:text-error transition-colors">
                    <Icon name="close" size={18} />
                  </button>
                </div>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifs.length === 0 ? (
                  <p className="text-sm text-on-surface-variant text-center py-8">No tienes notificaciones</p>
                ) : notifs.map((n, i) => (
                  <motion.div
                    key={n.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className={`p-3 border-b divider-teal flex items-start gap-3 hover:bg-primary/5 cursor-pointer transition-colors ${!n.read ? 'bg-primary/5' : ''}`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <Icon name={notifIcon(n.type)} size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-on-surface truncate">{n.title}</p>
                      {n.message && <p className="text-xs text-on-surface-variant">{n.message}</p>}
                      <p className="text-[10px] text-outline mt-1">{timeAgo(n.created_at)}</p>
                      {n.type === 'videollamada' && n.link && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleJoinNotif(n); }}
                          className="text-xs text-primary font-bold mt-1 hover:underline flex items-center gap-1"
                        >
                          Unirse <Icon name="open_in_new" size={12} />
                        </button>
                      )}
                    </div>
                    {!n.read && <span className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0" />}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Logout modal with mascot */}
      <AnimatePresence>
        {showLogout && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm"
            onClick={() => setShowLogout(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-panel rounded-3xl p-8 max-w-sm w-full mx-4 text-center"
            >
              <MascotAnimation type="goodbye" size="md" className="mx-auto mb-4" />
              <h3 className="font-headline-lg text-headline-lg gradient-text-editorial mb-2">¿Cerrar sesión?</h3>
              <p className="text-on-surface-variant text-sm mb-6">Tendrás que volver a ingresar tu token para acceder.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLogout(false)}
                  className="flex-1 py-3 rounded-xl bg-surface-variant/40 text-on-surface-variant font-bold hover:bg-surface-variant/60 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSignOut}
                  className="flex-1 py-3 rounded-xl bg-error text-on-error font-bold hover:scale-[0.98] transition-all"
                >
                  Cerrar sesión
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <LegalModal isOpen={legalModal !== null} onClose={() => setLegalModal(null)} type={legalModal ?? 'privacy'} />
    </div>
  );
}
