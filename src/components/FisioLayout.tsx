import { useState, useEffect, useRef, type ReactNode } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Dumbbell, Video, Sparkles, ScanLine, Phone, Bot } from 'lucide-react';
import { Icon } from './ui/Icon';
import { BackButton } from './ui/BackButton';
import { FloatingMenu, type FloatingMenuItem } from './ui/FloatingMenu';
import { LegalModal, type LegalDocType } from './ui/LegalModal';
import { useAuthStore } from '../stores/authStore';
import { useTheme } from '../context/ThemeContext';
import { useToast } from './ui/ToastProvider';
import { useInstall } from '../lib/installContext';
import { PhysiGuide } from './ui/PhysiGuide';
import { HelpGuideButton } from './ui/HelpGuideButton';
import { supabase } from '../lib/supabase';
import { cn, timeAgo } from '../lib/utils';
import MascotAnimation from './ui/MascotAnimation';

const navItems = [
  { to: '/dashboard-fisio', label: 'Inicio', icon: 'dashboard' },
  { to: '/patients', label: 'Pacientes', icon: 'group' },
  { to: '/ocr-scanner', label: 'Cargar Paciente', icon: 'person_add' },
  { to: '/tokens', label: 'Tokens', icon: 'key' },
  { to: '/fisio-exercises', label: 'Ejercicios', icon: 'fitness_center' },
  { to: '/fisio-stats', label: 'Estadísticas', icon: 'insights' },
  { to: '/tools', label: 'Herramientas', icon: 'construction' },
  { to: '/fisio-profile', label: 'Perfil', icon: 'account_circle' },
  { to: '/fisio-settings', label: 'Configuración', icon: 'settings' },
];

const breadcrumbMap: Record<string, string> = {
  '/dashboard-fisio': 'Dashboard',
  '/patients': 'Pacientes',
  '/ocr-scanner': 'Cargar Paciente',
  '/tokens': 'Tokens',
  '/fisio-exercises': 'Ejercicios',
  '/fisio-stats': 'Estadísticas',
  '/tools': 'Herramientas',
  '/fisio-profile': 'Perfil',
};

interface Notif {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

interface FisioLayoutProps {
  children: ReactNode;
}

export function FisioLayout({ children }: FisioLayoutProps) {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const { theme, toggleTheme } = useTheme();
  const toast = useToast();
  const { isInstalled, triggerInstall } = useInstall();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('fisio-sidebar-collapsed') === 'true');

  useEffect(() => {
    localStorage.setItem('fisio-sidebar-collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const sidebarWidth = sidebarCollapsed ? 64 : 256;
  const [showLogout, setShowLogout] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ patients: Array<{ id: string; name: string; email: string; diagnostico: string }>; exercises: Array<{ id: string; name: string; group: string }> }>({ patients: [], exercises: [] });
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Selector de paciente para iniciar videollamada desde el FAB
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [legalModal, setLegalModal] = useState<LegalDocType | null>(null);
  const [videoPatients, setVideoPatients] = useState<Array<{ id: string; name: string }>>([]);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoStarting, setVideoStarting] = useState(false);
  const [physiGuideOpen, setPhysiGuideOpen] = useState(false);

  const currentCrumb = breadcrumbMap[location.pathname] || 'Dashboard';

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

  useEffect(() => {
    if (!user?.id) return;
    loadNotifications();
    fetchUnreadCount();

    // Real-time subscription: update unread count + list when notifications change
    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadNotifications();
          fetchUnreadCount();
        },
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

  // Mark notifications as read when the dropdown is opened
  useEffect(() => {
    if (!showNotifications || !user?.id || unreadCount === 0) return;
    const markRead = async () => {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);
      setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    };
    markRead();
  }, [showNotifications, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadNotifications = async () => {
    if (!user?.id) return;
    try {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (data) {
        setNotifs(data as Notif[]);
      }
    } catch {
      // keep empty
    }
  };

  const fetchUnreadCount = async () => {
    if (!user?.id) return;
    try {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);
      setUnreadCount(count ?? 0);
    } catch {
      // keep current count
    }
  };

  const handleJoinNotif = async (notif: Notif) => {
    if (notif.link) window.open(notif.link, '_blank');
    try {
      await supabase.from('notifications').update({ read: true }).eq('id', notif.id);
      setNotifs((prev) => prev.map((n) => n.id === notif.id ? { ...n, read: true } : n));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch { /* network error — ignore */ }
  };

  const markAllRead = async () => {
    if (!user?.id) return;
    try {
      await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false);
      setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      toast.info('Todas las notificaciones marcadas como leídas');
    } catch {
      toast.error('No se pudieron marcar las notificaciones');
    }
  };

  const notifIcon = (type: string): string => {
    if (type === 'videollamada') return 'videocam';
    if (type === 'rutina') return 'fitness_center';
    if (type === 'sistema') return 'info';
    return 'notifications';
  };

  const handleSignOut = () => {
    signOut();
    toast.info('Sesión cerrada');
    navigate('/login');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      if (searchResults.patients.length > 0) {
        navigate('/paciente/' + searchResults.patients[0].id);
      } else {
        navigate('/patients?q=' + encodeURIComponent(searchQuery.trim()));
      }
      setSearchQuery('');
      setShowSearchDropdown(false);
    }
  };

  const performSearch = async (query: string) => {
    if (!query.trim() || query.trim().length < 2) { setSearchResults({ patients: [], exercises: [] }); return; }
    try {
      const [patRes, exRes] = await Promise.all([
        supabase.from('profiles')
          .select('id, full_name, email, diagnostico, documento_identidad, patologia')
          .or(`full_name.ilike.%${query}%,email.ilike.%${query}%,diagnostico.ilike.%${query}%,documento_identidad.ilike.%${query}%,patologia.ilike.%${query}%`)
          .eq('role', 'paciente')
          .limit(8),
        supabase.from('exercises').select('id, name, muscle_group').or(`name.ilike.%${query}%,muscle_group.ilike.%${query}%`).limit(5),
      ]);
      setSearchResults({
        patients: (patRes.data as Array<{ id: string; name: string; email: string; diagnostico: string }> | null)?.map((p) => ({ id: p.id, name: (p as any).full_name || p.name, email: p.email || '', diagnostico: (p as any).diagnostico || (p as any).patologia || '' })) || [],
        exercises: (exRes.data as Array<{ id: string; name: string; group: string }> | null)?.map((e) => ({ id: e.id, name: (e as any).name || e.name, group: (e as any).muscle_group || e.group || '' })) || [],
      });
    } catch { /* keep empty */ }
  };

  const onSearchChange = (val: string) => {
    setSearchQuery(val);
    setShowSearchDropdown(true);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => performSearch(val), 300);
  };

  // --- FAB: Videollamada con paciente ---
  const abrirSelectorPaciente = async () => {
    if (!user?.id) { toast.info('No hay sesión activa'); return; }
    setShowVideoModal(true);
    setVideoLoading(true);
    try {
      const { data: links } = await supabase
        .from('pacientes_terapeutas')
        .select('paciente_id')
        .eq('terapeuta_id', user.id);
      if (!links || links.length === 0) {
        setVideoPatients([]);
        setVideoLoading(false);
        return;
      }
      const ids = links.map((l) => l.paciente_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', ids)
        .order('full_name', { ascending: true });
      setVideoPatients((profiles || []).map((p: any) => ({ id: p.id, name: p.full_name || 'Paciente' })));
    } catch {
      setVideoPatients([]);
    } finally {
      setVideoLoading(false);
    }
  };

  const iniciarVideollamadaPaciente = async (paciente: { id: string; name: string }) => {
    if (!user?.id) return;
    setVideoStarting(true);
    try {
      const jitsiUrl = `https://meet.jit.si/FisioMirror-${user.id}-${paciente.id}`;
      window.open(jitsiUrl, '_blank');
      // Notificar al paciente a través de la edge function (service_role),
      // que es la única vía autorizada para crear notificaciones.
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
      const res = await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          fisio_id: paciente.id,
          type: 'videollamada',
          title: 'Videollamada entrante',
          message: `${user.full_name || 'Tu fisioterapeuta'} quiere iniciar una videollamada`,
          link: jitsiUrl,
        }),
      });
      if (!res.ok) {
        throw new Error(`send-notification respondió ${res.status}`);
      }
      toast.success(`Videollamada iniciada con ${paciente.name}. Se envió la notificación.`);
      setShowVideoModal(false);
    } catch {
      toast.error('No se pudo iniciar la videollamada');
    } finally {
      setVideoStarting(false);
    }
  };

  const quickActionItems: FloatingMenuItem[] = [
    { label: 'Nuevo paciente', icon: <UserPlus size={20} className="text-primary" />, onClick: () => navigate('/ocr-scanner') },
    { label: 'Crear rutina', icon: <Dumbbell size={20} className="text-primary" />, onClick: () => navigate('/fisio-exercises') },
    { label: 'Videollamada', icon: <Video size={20} className="text-primary" />, onClick: abrirSelectorPaciente },
    { label: 'Herramientas IA', icon: <Sparkles size={20} className="text-primary" />, onClick: () => navigate('/tools') },
    { label: 'Escanear receta', icon: <ScanLine size={20} className="text-primary" />, onClick: () => navigate('/ocr-scanner') },
  ];

  const renderNavItem = (item: { to: string; label: string; icon: string }, collapsed: boolean, onNavigate?: () => void) => (
    <NavLink
      key={item.to}
      to={item.to}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'flex items-center rounded-xl transition-all',
          collapsed ? 'justify-center px-2 py-3' : 'gap-4 px-4 py-3',
          isActive
            ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 font-bold'
            : 'text-gray-700 dark:text-gray-200 font-medium hover:bg-teal-50/60 dark:hover:bg-slate-700/60',
        )
      }
      title={collapsed ? item.label : undefined}
    >
      <Icon name={item.icon} size={22} className="shrink-0" />
      {!collapsed && <span className="text-sm">{item.label}</span>}
    </NavLink>
  );

  const renderBottomActions = (collapsed: boolean, onNavAway?: () => void) => (
    <div className={cn('shrink-0 border-t border-teal-100 dark:border-slate-700 p-3', collapsed ? 'flex flex-col items-center gap-2' : 'space-y-3')}>
      {!isInstalled && (
        <button
          onClick={async () => {
            const result = await triggerInstall();
            if (result === 'unavailable') {
              toast.info('Para instalar la app, usa el menú de tu navegador: Agregar a pantalla de inicio');
            } else if (result === 'accepted') {
              toast.success('App instalada correctamente');
            }
          }}
          className={cn(
            'rounded-xl text-gray-700 dark:text-gray-200 hover:bg-teal-50 dark:hover:bg-slate-700 hover:text-teal-700 dark:hover:text-teal-300 transition-colors',
            collapsed ? 'p-2' : 'flex items-center gap-3 px-3 py-2 w-full',
          )}
          title={collapsed ? 'Instalar App' : undefined}
        >
          <Icon name="download_for_offline" size={22} className="shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Instalar App</span>}
        </button>
      )}
      {!collapsed && (
        <div className="rounded-2xl bg-teal-50 dark:bg-slate-700 p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-bold text-sm overflow-hidden shrink-0">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              user?.full_name?.charAt(0) || 'F'
            )}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm text-gray-900 dark:text-gray-100 truncate">{user?.full_name || 'Fisioterapeuta'}</p>
            <p className="text-[10px] text-teal-600 dark:text-teal-400 uppercase tracking-wider">Fisioterapeuta</p>
          </div>
        </div>
      )}
      <div className={cn(collapsed ? 'flex flex-col items-center gap-2' : 'flex items-center justify-between px-2')}>
        <button
          onClick={toggleTheme}
          aria-label="Cambiar tema"
          className="p-2 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-teal-50 dark:hover:bg-slate-700 hover:text-teal-700 dark:hover:text-teal-300 transition-colors"
        >
          <Icon name={theme === 'dark' ? 'light_mode' : 'dark_mode'} size={22} />
        </button>
        <button
          onClick={() => { onNavAway?.(); setShowNotifications(true); }}
          aria-label="Notificaciones"
          className="relative p-2 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-teal-50 dark:hover:bg-slate-700 hover:text-teal-700 dark:hover:text-teal-300 transition-colors"
        >
          <Icon name="notifications" size={22} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-[16px] bg-red-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center px-1">{unreadCount > 9 ? '9+' : unreadCount}</span>
          )}
        </button>
        <button
          onClick={() => { onNavAway?.(); setShowLogout(true); }}
          aria-label="Cerrar sesión"
          className="p-2 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 transition-colors"
        >
          <Icon name="logout" size={22} />
        </button>
      </div>
    </div>
  );

  const sidebarContent = (collapsed: boolean, opts?: { onNavigate?: () => void; showToggle?: boolean }) => (
    <>
      <div className="p-5 shrink-0 relative flex items-center" style={{ minHeight: 64 }}>
        {!collapsed ? (
          <div className="flex items-center gap-2 min-w-0">
            <img src="/logo.png" alt="" className="h-10 w-auto shrink-0" />
            <div className="flex flex-col min-w-0 overflow-hidden">
              <h1 className="font-headline-lg text-headline-lg gradient-text-editorial tracking-tight leading-none truncate">FisioMirror</h1>
              <p className="text-[10px] uppercase tracking-widest text-teal-600 dark:text-teal-400 mt-0.5 font-bold truncate">Edición Clínica v2.0</p>
            </div>
          </div>
        ) : (
          <div className="w-full flex justify-center">
            <img src="/logo.png" alt="" className="h-9 w-auto" />
          </div>
        )}
        {opts?.showToggle && (
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            aria-label={sidebarCollapsed ? 'Expandir menú' : 'Colapsar menú'}
            className="hidden lg:flex absolute top-4 right-2 w-6 h-6 rounded-full bg-primary text-on-primary items-center justify-center text-xs shadow-md hover:scale-110 transition-transform z-10"
          >
            <Icon name={sidebarCollapsed ? 'chevron_right' : 'chevron_left'} size={14} />
          </button>
        )}
      </div>

      <nav className="flex-1 px-2 space-y-1 overflow-y-auto overflow-x-hidden">
        {navItems.map((item) => renderNavItem(item, collapsed, opts?.onNavigate))}
      </nav>

      {renderBottomActions(collapsed, opts?.onNavigate)}
    </>
  );

  const desktopSidebar = (
    <aside
      className="fixed left-0 top-0 h-screen flex flex-col z-30 bg-teal-50/40 dark:bg-slate-900 border-r border-teal-200/40 dark:border-teal-800/30 text-gray-900 dark:text-gray-200 transition-all duration-300 overflow-hidden"
      style={{ width: `${sidebarWidth}px` }}
    >
      {sidebarContent(sidebarCollapsed, { showToggle: true })}
    </aside>
  );

  return (
    <div className="flex h-screen w-full overflow-hidden relative" style={{ ['--fisio-sidebar-w' as string]: `${sidebarWidth}px` }}>
      {/* Desktop sidebar */}
      <div className="hidden lg:block">{desktopSidebar}</div>

      {/* Mobile sidebar */}
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

      {/* Main content */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto lg:ml-[var(--fisio-sidebar-w)]" data-scroll-root>
        <header className="h-16 glass-panel sticky top-0 z-30 flex items-center justify-between px-3 sm:px-6">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Abrir menú"
              className="lg:hidden text-primary shrink-0"
            >
              <Icon name="menu" size={24} />
            </button>
            <BackButton />
            <div className="hidden sm:flex items-center text-outline text-label-sm gap-2">
              <span className="hover:text-primary cursor-pointer">Inicio</span>
              <Icon name="chevron_right" size={14} />
              <span className="text-on-surface font-bold">{currentCrumb}</span>
            </div>
            <span className="sm:hidden text-on-surface font-bold text-sm truncate">{currentCrumb}</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-4 shrink-0">
            <div className={`hidden sm:inline-flex online-indicator is-${isOnline ? 'online' : 'offline'}`}>
              <span className="dot" />
              <span>{isOnline ? 'Online' : 'Offline'}</span>
            </div>
            <form onSubmit={handleSearch} className="hidden md:flex items-center bg-surface-variant/30 rounded-full pl-10 pr-4 py-2 w-72 relative">
              <Icon name="search" size={18} className="absolute left-3 text-outline" />
              <input
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                onFocus={() => setShowSearchDropdown(true)}
                onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
                className="bg-transparent border-none focus:ring-0 text-label-sm w-full outline-none placeholder:text-outline"
                placeholder="Buscar pacientes o ejercicios... (⌘K)"
              />
              {showSearchDropdown && (searchResults.patients.length > 0 || searchResults.exercises.length > 0) && (
                <div className="absolute top-full left-0 right-0 mt-2 glass-panel rounded-2xl shadow-2xl overflow-hidden z-50">
                  {searchResults.patients.length > 0 && (
                    <div className="p-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-outline px-2 py-1">Pacientes</p>
                      {searchResults.patients.map((p) => (
                        <button key={p.id} type="button" onClick={() => { navigate('/paciente/' + p.id); setSearchQuery(''); setShowSearchDropdown(false); }} className="w-full text-left px-3 py-2 rounded-xl hover:bg-primary/10 transition-colors flex items-center gap-2">
                          <Icon name="person" size={16} className="text-primary" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-on-surface truncate">{p.name}</p>
                            <p className="text-xs text-outline truncate">{p.email || p.diagnostico || 'Sin email'}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {searchResults.exercises.length > 0 && (
                    <div className="p-2 border-t divider-teal">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-outline px-2 py-1">Ejercicios</p>
                      {searchResults.exercises.map((ex) => (
                        <button key={ex.id} type="button" onClick={() => { navigate('/fisio-exercises'); setSearchQuery(''); setShowSearchDropdown(false); }} className="w-full text-left px-3 py-2 rounded-xl hover:bg-primary/10 transition-colors flex items-center gap-2">
                          <Icon name="fitness_center" size={16} className="text-primary" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-on-surface truncate">{ex.name}</p>
                            <p className="text-xs text-outline truncate">{ex.group}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </form>
            <HelpGuideButton onStartTour={() => setPhysiGuideOpen(true)} />
            <button
              onClick={() => setPhysiGuideOpen(true)}
              className="text-on-surface-variant hover:text-primary transition-colors active-scale"
              aria-label="Abrir guía de Physi"
            >
              <Bot size={20} />
            </button>
            <button
              onClick={toggleTheme}
              className="text-on-surface-variant hover:text-primary transition-colors active-scale"
              aria-label="Cambiar tema"
            >
              <Icon name={theme === 'dark' ? 'light_mode' : 'dark_mode'} size={20} />
            </button>
            <button
              onClick={() => setShowNotifications((v) => !v)}
              className="relative text-on-surface-variant hover:text-primary transition-colors active-scale"
              aria-label={`Notificaciones, ${unreadCount} sin leer`}
            >
              <Icon name="notifications" size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-error rounded-full text-white text-[10px] font-bold flex items-center justify-center px-1 badge-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setShowLogout(true)}
              className="text-on-surface-variant hover:text-error transition-colors active-scale"
              aria-label="Cerrar sesión"
            >
              <Icon name="logout" size={20} />
            </button>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8 flex-1 bg-teal-50/20 dark:bg-slate-950/20">{children}</div>

        <footer className="pt-6 pb-6 px-4 sm:px-8 flex flex-col md:flex-row justify-between text-outline text-xs gap-4 border-t border-white/10">
          <span>&copy; 2025 FisioMirror S.A. | Edición Clínica Premium v2.0.42</span>
          <div className="flex gap-4">
            <button onClick={() => setLegalModal('consent')} className="text-outline hover:text-primary transition-colors">Consentimiento Informado</button>
            <button onClick={() => setLegalModal('terms')} className="text-outline hover:text-primary transition-colors">Términos de Servicio</button>
            <button onClick={() => setLegalModal('privacy')} className="text-outline hover:text-primary transition-colors">Privacidad de Datos</button>
          </div>
        </footer>
      </main>

      {/* Menú de acciones flotante (FAB) para el fisioterapeuta */}
      <FloatingMenu
        items={quickActionItems}
        ariaLabel="Acciones del fisioterapeuta"
        className="fixed bottom-20 right-6 z-50 lg:bottom-6"
      />

      {/* Modal: selector de paciente para iniciar videollamada */}
      <AnimatePresence>
        {showVideoModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
            onClick={() => !videoStarting && setShowVideoModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-panel rounded-3xl p-6 max-w-sm w-full shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Video size={22} />
                  </div>
                  <h3 className="font-title-md text-title-md text-on-surface">Iniciar videollamada</h3>
                </div>
                <button
                  onClick={() => !videoStarting && setShowVideoModal(false)}
                  aria-label="Cerrar"
                  className="text-outline hover:text-error transition-colors p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  <Icon name="close" size={20} />
                </button>
              </div>
              <p className="text-on-surface-variant text-sm mb-4">Selecciona el paciente con quien quieres iniciar la videollamada.</p>

              {videoLoading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                </div>
              ) : videoPatients.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-on-surface-variant text-sm mb-4">No tienes pacientes vinculados todavía.</p>
                  <button
                    onClick={() => { setShowVideoModal(false); navigate('/ocr-scanner'); }}
                    className="px-5 py-3 rounded-xl bg-primary text-on-primary font-bold text-sm hover:scale-[0.98] transition-all min-h-[48px]"
                  >
                    Cargar nuevo paciente
                  </button>
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {videoPatients.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => iniciarVideollamadaPaciente(p)}
                      disabled={videoStarting}
                      className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-primary/5 transition-colors text-left disabled:opacity-50 min-h-[52px]"
                    >
                      <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-bold shrink-0">
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="flex-1 min-w-0 font-medium text-sm text-on-surface truncate">{p.name}</span>
                      <Phone size={18} className="text-primary shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Logout modal */}
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
              <MascotAnimation type="goodbye" size="md" className="bg-error/10 mx-auto mb-4" />
              <h3 className="font-headline-lg text-headline-lg text-on-surface mb-2">¿Cerrar sesión?</h3>
              <p className="text-on-surface-variant text-sm mb-6">Tendrás que volver a iniciar sesión para acceder a tu panel.</p>
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

      {/* Notifications panel */}
      <AnimatePresence>
        {showNotifications && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowNotifications(false)}
            className="fixed inset-0 z-[100]"
          >
            <motion.div
              initial={{ opacity: 0, x: 20, y: -10 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, x: 20, y: -10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="fixed top-20 right-4 sm:right-6 z-[101] glass-dropdown rounded-3xl p-4 w-[calc(100vw-2rem)] sm:w-80 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4 px-2">
                <div className="flex items-center gap-3">
                  <MascotAnimation type="notification" size="xs" />
                  <h3 className="font-title-md text-title-md text-on-surface">Notificaciones</h3>
                </div>
                <button onClick={() => setShowNotifications(false)} aria-label="Cerrar notificaciones" className="text-outline hover:text-error transition-colors">
                  <Icon name="close" size={20} />
                </button>
              </div>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {notifs.length === 0 && (
                  <p className="text-center text-on-surface-variant text-sm py-8">No tienes notificaciones</p>
                )}
                {notifs.map((n, i) => (
                  <motion.div
                    key={n.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className={`flex items-start gap-3 p-3 rounded-2xl hover:bg-primary/5 cursor-pointer transition-colors ${!n.read ? 'bg-primary/5' : ''}`}
                  >
                    <div className={'w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0'}>
                      <Icon name={notifIcon(n.type)} size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-on-surface truncate">{n.title}</p>
                      {n.message && <p className="text-xs text-on-surface-variant truncate">{n.message}</p>}
                      <p className="text-[10px] text-outline mt-1">{timeAgo(n.created_at)}</p>
                      {n.type === 'videollamada' && n.link && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleJoinNotif(n); }}
                          className="text-primary font-bold text-xs mt-1 hover:underline flex items-center gap-1"
                        >
                          Unirse <Icon name="open_in_new" size={12} />
                        </button>
                      )}
                    </div>
                    {!n.read && <span className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0" />}
                  </motion.div>
                ))}
              </div>
              <button
                onClick={markAllRead}
                className="w-full mt-3 py-2 text-center text-primary font-bold text-sm hover:bg-primary/5 rounded-xl transition-colors"
              >
                Marcar todas como leídas
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <LegalModal isOpen={legalModal !== null} onClose={() => setLegalModal(null)} type={legalModal ?? 'privacy'} />

      <PhysiGuide controlledOpen={physiGuideOpen} onControlledClose={() => setPhysiGuideOpen(false)} />
    </div>
  );
}
