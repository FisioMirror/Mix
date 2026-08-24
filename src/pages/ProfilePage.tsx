import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '../components/ui/Icon';
import { GlassPanel } from '../components/ui/Glass';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/ToastProvider';
import { useTheme } from '../context/ThemeContext';
import { MedicalIcon } from '../components/ui/MedicalIcon';
import { AnimatedTabs } from '../components/ui/AnimatedTabs';
import { AnimatedLink } from '../components/ui/AnimatedLink';
import { GlassModal } from '../components/ui/GlassModal';
import { LegalModal, type LegalDocType } from '../components/ui/LegalModal';
import { compressImage } from '../lib/utils';

export function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const { theme, toggleTheme } = useTheme();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ full_name: '', especialidad: '', universidad: '', cedula: '', colegiado_id: '', anio_egreso: '' });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xlarge'>('normal');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  // ---- Avatar upload (vista previa antes de guardar) ----
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [legalModal, setLegalModal] = useState<LegalDocType | null>(null);
  const [clinicNameEditing, setClinicNameEditing] = useState(false);
  const [clinicNameValue, setClinicNameValue] = useState('');
  const [clinicNameSaving, setClinicNameSaving] = useState(false);
  const [clinicNameHover, setClinicNameHover] = useState(false);
  const clinicNameRef = useRef<HTMLInputElement>(null);

  // Pacientes activos hoy / sesiones programadas (fisio only)
  const [activeToday, setActiveToday] = useState<{ name: string; sessionTime: string; diagnosis: string }[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

  const isFisio = user?.role === 'fisioterapeuta';

  useEffect(() => {
    const saved = localStorage.getItem('fisiomirror-font-size') as 'normal' | 'large' | 'xlarge' | null;
    if (saved) {
      setFontSize(saved);
      document.documentElement.dataset.fontSize = saved;
    }
  }, []);

  const handleFontSizeChange = async (size: 'normal' | 'large' | 'xlarge') => {
    setFontSize(size);
    localStorage.setItem('fisiomirror-font-size', size);
    document.documentElement.dataset.fontSize = size;
    if (user?.id) {
      try {
        await supabase.from('profiles').update({ font_size: size }).eq('id', user.id);
        useAuthStore.setState({ user: { ...user, font_size: size } });
      } catch {
        // ignore DB errors — preference still saved locally
      }
    }
  };

  useEffect(() => {
    if (user && !editing) {
      setForm({
        full_name: user.full_name || '',
        especialidad: user.especialidad || '',
        universidad: user.universidad || '',
        cedula: user.cedula || '',
        colegiado_id: user.colegiado_id || '',
        anio_egreso: user.anio_egreso?.toString() || '',
      });
      setAvatarUrl(user.avatar_url ?? null);
    }
  }, [user, editing]);

  // ---- Clinic name inline editing ----
  const startClinicEdit = () => {
    setClinicNameValue(user?.clinic_name || '');
    setClinicNameEditing(true);
    requestAnimationFrame(() => clinicNameRef.current?.focus());
  };

  const saveClinicName = async () => {
    if (!user?.id) return;
    const trimmed = clinicNameValue.trim();
    if (!trimmed) {
      setClinicNameEditing(false);
      return;
    }
    if (trimmed === (user?.clinic_name || '')) {
      setClinicNameEditing(false);
      return;
    }
    setClinicNameSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ clinic_name: trimmed, updated_at: new Date().toISOString() })
        .eq('id', user.id);
      if (error) throw error;
      useAuthStore.setState({ user: { ...user, clinic_name: trimmed } });
      toast.success('Nombre de clínica actualizado');
    } catch {
      toast.error('Error al guardar el nombre de la clínica');
    } finally {
      setClinicNameSaving(false);
      setClinicNameEditing(false);
    }
  };

  const cancelClinicEdit = () => {
    setClinicNameEditing(false);
    setClinicNameValue(user?.clinic_name || '');
  };

  // ---- Pacientes activos hoy / sesiones programadas (fisio) ----
  useEffect(() => {
    if (!isFisio || !user?.id) return;
    let cancelled = false;
    (async () => {
      setLoadingActivity(true);
      try {
        const { data: links } = await supabase
          .from('pacientes_terapeutas')
          .select('paciente_id')
          .eq('terapeuta_id', user.id);
        if (!links || links.length === 0) {
          if (!cancelled) setActiveToday([]);
          return;
        }
        const ids = links.map((l) => l.paciente_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, diagnostico')
          .in('id', ids);
        const today = new Date().toISOString().split('T')[0];
        const { data: sessions } = await supabase
          .from('sesiones_completadas')
          .select('paciente_id, fecha, calidad_ejecucion')
          .in('paciente_id', ids)
          .gte('fecha', today)
          .order('fecha', { ascending: true })
          .limit(10);
        if (cancelled) return;
        const todayList = (profiles || []).map((p) => {
          const s = sessions?.find((x) => x.paciente_id === p.id);
          return {
            name: p.full_name,
            sessionTime: s ? new Date(s.fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : 'Pendiente',
            diagnosis: p.diagnostico || 'Sin diagnóstico',
          };
        });
        setActiveToday(todayList.slice(0, 6));
      } catch {
        if (!cancelled) setActiveToday([]);
      } finally {
        if (!cancelled) setLoadingActivity(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, isFisio]);

  const saveProfile = async () => {
    if (!user?.id) return;
    try {
      const { error } = await supabase.from('profiles').update({
        full_name: form.full_name,
        especialidad: form.especialidad || null,
        universidad: form.universidad || null,
        cedula: form.cedula || null,
        colegiado_id: form.colegiado_id || null,
        anio_egreso: form.anio_egreso ? parseInt(form.anio_egreso, 10) : null,
        updated_at: new Date().toISOString(),
      }).eq('id', user.id);
      if (error) throw error;
      useAuthStore.setState({ user: { ...user, full_name: form.full_name, especialidad: form.especialidad || null, universidad: form.universidad || null, cedula: form.cedula || null, colegiado_id: form.colegiado_id || null, anio_egreso: form.anio_egreso ? parseInt(form.anio_egreso, 10) : null } });
      toast.success('Perfil actualizado');
      setEditing(false);
    } catch {
      toast.error('Error actualizando perfil');
    }
  };

  // Selecciona una imagen, la comprime y muestra una vista previa sin subirla todavía.
  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Limpiar el input para permitir volver a seleccionar el mismo archivo.
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!file || !user?.id) return;

    // 1. Validar formato
    if (!file.type.startsWith('image/')) {
      toast.error('Formato no válido', { description: 'Selecciona un archivo de imagen (JPG, PNG, WebP…).' });
      return;
    }
    // 2. Validar tamaño en disco (rechazar archivos absurdamente grandes antes de procesar).
    const MAX_INPUT_BYTES = 10 * 1024 * 1024; // 10MB tope absoluto de entrada
    if (file.size > MAX_INPUT_BYTES) {
      toast.error('Imagen demasiado grande', { description: 'El archivo supera los 10MB. Usa una imagen más pequeña.' });
      return;
    }

    try {
      // 3. Comprimir: máximo 300x300 y 1MB.
      const compressed = await compressImage(file, 300, 0.85, 1024 * 1024);
      if (compressed.size > 1024 * 1024) {
        toast.warning('Imagen muy pesada', { description: 'No se pudo comprimir por debajo de 1MB. Prueba con otra imagen.' });
        return;
      }
      // 4. Generar vista previa local (sin subir).
      const previewUrl = URL.createObjectURL(compressed);
      setAvatarPreview(previewUrl);
    } catch (err) {
      const msg = (err as Error)?.message || '';
      if (/corrupta|no se puede cargar/i.test(msg)) {
        toast.error('Imagen corrupta', { description: 'No se pudo leer la imagen. Vuelve a intentarlo.' });
      } else if (/No se pudo leer|FileReader/i.test(msg)) {
        toast.error('Error de lectura', { description: 'No se pudo acceder al archivo seleccionado.' });
      } else {
        toast.error('Error al procesar la imagen', { description: msg || 'Inténtalo de nuevo.' });
      }
    }
  };

  // Sube la imagen previamente seleccionada al bucket 'avatars' y guarda la URL.
  const handleAvatarSave = async () => {
    if (!user?.id || !avatarPreview) return;
    setAvatarUploading(true);
    try {
      // Recuperar el File desde la URL de previsualización (object URL).
      const resp = await fetch(avatarPreview);
      const blob = await resp.blob();
      const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });

      const path = `${user.id}/avatar.jpg`;
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, {
        upsert: true,
        contentType: 'image/jpeg',
      });
      if (upErr) throw upErr;

      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      const publicUrl = data.publicUrl;

      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', user.id);
      if (updateErr) throw new Error(updateErr.message);

      setAvatarUrl(publicUrl);
      useAuthStore.setState({ user: { ...user, avatar_url: publicUrl } });
      toast.success('Foto de perfil actualizada', { description: 'Tu nueva foto se ha guardado correctamente.' });
      cancelAvatarPreview();
    } catch (err) {
      const msg = (err as Error)?.message || '';
      if (/Failed to fetch|NetworkError|network/i.test(msg)) {
        toast.error('Error de conexión', { description: 'No se pudo conectar con el servidor. Revisa tu red e inténtalo de nuevo.' });
      } else if (/policy|row-level security|RLS|403|unauthorized|401/i.test(msg)) {
        toast.error('Permiso denegado', { description: 'No tienes permiso para subir esta imagen. Vuelve a iniciar sesión.' });
      } else if (/bucket|not found|404/i.test(msg)) {
        toast.error('Almacén no disponible', { description: 'El espacio de almacenamiento no está configurado. Contacta con soporte.' });
      } else {
        toast.error('Error al subir la foto', { description: msg || 'Inténtalo de nuevo en unos segundos.' });
      }
    } finally {
      setAvatarUploading(false);
    }
  };

  // Cancela la vista previa sin subir.
  const cancelAvatarPreview = () => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarPreview(null);
  };

  return (
    <div className="space-y-6 overflow-x-hidden max-w-7xl mx-auto w-full">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Profile card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="lg:col-span-4 glass-card vibrant-hover rounded-[32px] p-6 flex flex-col items-center text-center hover-lift accent-teal relative overflow-hidden">
          <div className="blob-teal w-32 h-32 -top-6 -right-6 opacity-40" />
          <div className="relative">
            <div className="avatar-ring w-32 h-32">
              <div className="w-full h-full rounded-[inherit] bg-primary-container flex items-center justify-center text-on-primary-container text-4xl font-bold overflow-hidden">
                {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : (user?.full_name?.charAt(0) || 'F')}
              </div>
            </div>
            <label className="absolute bottom-0 right-0 w-10 h-10 bg-primary text-on-primary rounded-full border-4 border-surface flex items-center justify-center cursor-pointer hover:scale-105 transition-transform breathe-badge glow-teal">
              <Icon name="photo_camera" size={18} />
              <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleAvatarSelect} />
            </label>
            {/* Vista previa + confirmación antes de guardar */}
            <AnimatePresence>
              {avatarPreview && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute inset-0 -bottom-2 flex flex-col items-center justify-center gap-2 bg-surface/95 backdrop-blur-sm rounded-[inherit] p-3 z-20"
                >
                  <img src={avatarPreview} alt="Vista previa" className="w-24 h-24 rounded-full object-cover ring-4 ring-cyan-400/60" />
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      type="button"
                      onClick={cancelAvatarPreview}
                      disabled={avatarUploading}
                      className="px-3 py-1.5 rounded-lg bg-surface-variant/40 text-on-surface-variant text-xs font-bold hover:bg-surface-variant/60 transition-colors disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleAvatarSave}
                      disabled={avatarUploading}
                      className="px-3 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-bold hover:scale-105 transition-transform disabled:opacity-50 flex items-center gap-1 glow-teal"
                    >
                      {avatarUploading ? (
                        <span className="w-3 h-3 rounded-full border-2 border-on-primary/30 border-t-on-primary animate-spin" />
                      ) : (
                        <Icon name="check" size={14} />
                      )}
                      Guardar
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <h2 className="font-display font-headline-lg text-headline-lg-mobile lg:text-headline-lg gradient-text-living mt-4 relative">{user?.full_name || 'Usuario'}</h2>
          <div className="font-title-md text-primary bg-primary-container/10 px-4 py-1 rounded-full mt-2 flex items-center gap-2 breathe-badge glow-teal relative">
            <MedicalIcon name="clipboard" size={16} className="text-primary animate-breathe-icon" />
            {isFisio ? 'Fisioterapeuta' : 'Paciente'}
          </div>
          <div className="w-full space-y-2 mt-6">
            {user?.email && (
              <div className="p-3 bg-surface-container-low/60 rounded-2xl border divider-teal flex items-center gap-2 relative">
                <Icon name="mail" size={18} className="text-outline" />
                <span className="text-sm">{user.email}</span>
              </div>
            )}
            {user?.cedula && (
              <div className="p-3 bg-surface-container-low/60 rounded-2xl border divider-teal flex items-center gap-2 relative">
                <Icon name="badge" size={18} className="text-outline" />
                <span className="text-sm">{user.cedula}</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Settings bento */}
        <div className="lg:col-span-8 space-y-6 w-full min-w-0">
          <AnimatedTabs
            tabs={[
              { id: 'personal', label: 'Datos Personales', content: (
                <GlassPanel className="p-6 rounded-[32px] card-glow-hover shimmer-border hover-lift accent-teal">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-headline-lg-mobile gradient-text-living font-bold">Información Personal</h3>
                    <button onClick={() => setEditing(!editing)} className="flex items-center gap-2 text-primary font-bold text-sm hover-lift badge-teal px-3 py-1 rounded-full breathe-badge">
                      <Icon name="edit" size={16} /> {editing ? 'Cancelar' : 'Editar'}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { label: 'Nombre Completo', key: 'full_name', type: 'text' },
                      { label: isFisio ? 'Especialidad' : 'Condición / Diagnóstico', key: 'especialidad', type: 'text' },
                      ...(isFisio ? [{ label: 'Universidad', key: 'universidad', type: 'text' }] : []),
                      { label: 'Cédula', key: 'cedula', type: 'text' },
                      { label: 'Colegiado ID', key: 'colegiado_id', type: 'text' },
                      { label: 'Año de Egreso', key: 'anio_egreso', type: 'number' },
                    ].map((field) => (
                      <div key={field.key} className="p-4 rounded-2xl bg-surface-container-low/60 border divider-teal">
                        <label className="text-[10px] uppercase text-outline font-bold block mb-1">{field.label}</label>
                        {editing ? (
                          <input
                            type={field.type}
                            value={(form as Record<string, string>)[field.key]}
                            onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                            className="input-base"
                          />
                        ) : (
                          <span className="font-medium text-on-surface">{(form as Record<string, string>)[field.key] || '—'}</span>
                        )}
                      </div>
                    ))}
                  </div>
                  {editing && (
                    <button onClick={saveProfile} className="premium-btn mt-4 px-6 py-3 bg-primary text-on-primary rounded-xl font-bold hover:scale-[1.02] active:scale-95 transition-all glow-teal breathe-teal">
                      Guardar Cambios
                    </button>
                  )}
                </GlassPanel>
              ) },
              { id: 'preferences', label: 'Preferencias', content: (
                <>
                <GlassPanel className="p-6 rounded-[32px] card-glow-hover hover-lift">
                  <h3 className="font-headline-lg-mobile gradient-text-living font-bold mb-6">Preferencias del Sistema</h3>
                  <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-surface-variant/20 rounded-2xl gap-3">
                      <div className="flex items-center gap-3">
                        <Icon name="format_size" size={24} className="text-outline animate-breathe-icon" />
                        <div><p className="font-medium">Tamaño de fuente</p><p className="text-xs text-outline">Ajusta el tamaño del texto en toda la app</p></div>
                      </div>
                      <div className="flex gap-2">
                        {([
                          { key: 'normal', label: 'Normal' },
                          { key: 'large', label: 'Grande' },
                          { key: 'xlarge', label: 'Muy grande' },
                        ] as const).map((opt) => (
                          <button
                            key={opt.key}
                            onClick={() => handleFontSizeChange(opt.key)}
                            className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${fontSize === opt.key ? 'bg-primary text-on-primary' : 'bg-surface-variant/30 border border-outline-variant/30 text-on-surface hover:bg-surface-variant/50'}`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-4 hover:bg-surface-variant/20 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <Icon name="dark_mode" size={24} className="text-outline animate-breathe-icon" />
                        <div><p className="font-medium">Modo Oscuro</p><p className="text-xs text-outline">Cambio automático soportado</p></div>
                      </div>
                      <button
                        onClick={toggleTheme}
                        className={`w-14 h-8 rounded-full transition-colors ${theme === 'dark' ? 'bg-primary' : 'bg-outline-variant'}`}
                      >
                        <div className={`w-6 h-6 bg-white rounded-full transition-transform ${theme === 'dark' ? 'translate-x-7' : 'translate-x-1'}`} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between p-4 hover:bg-surface-variant/20 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <Icon name="notifications_active" size={24} className="text-outline animate-breathe-icon" />
                        <div><p className="font-medium">Notificaciones Push</p><p className="text-xs text-outline">Alertas de pacientes y actualizaciones de rutina</p></div>
                      </div>
                      <button
                        onClick={() => setPushNotifications(!pushNotifications)}
                        className={`w-14 h-8 rounded-full transition-colors ${pushNotifications ? 'bg-primary' : 'bg-outline-variant'}`}
                      >
                        <div className={`w-6 h-6 bg-white rounded-full transition-transform ${pushNotifications ? 'translate-x-7' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  </div>
                </GlassPanel>
                {isFisio && (
                  <GlassPanel className="p-6 rounded-[32px] card-glow-hover hover-lift mt-6 shimmer-border relative overflow-hidden">
                    <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gradient-to-br from-cyan-400/15 to-teal-500/10 blur-2xl pointer-events-none" />
                    <h3 className="font-headline-lg-mobile gradient-text-living font-bold mb-6 relative">Configuración de Clínica</h3>
                    <div className="relative">
                      <label className="text-[10px] uppercase text-outline font-bold block mb-2">Nombre de la Clínica</label>
                      <div
                        className="flex items-center gap-3 p-4 rounded-2xl bg-surface-container-low/60 border divider-teal transition-all"
                        onMouseEnter={() => setClinicNameHover(true)}
                        onMouseLeave={() => setClinicNameHover(false)}
                      >
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500/15 to-cyan-400/10 flex items-center justify-center ring-1 ring-cyan-500/20 breathe-teal flex-shrink-0">
                          <Icon name="medical_services" size={24} className="icon-accent-cyan animate-breathe-icon" />
                        </div>
                        {clinicNameEditing ? (
                          <input
                            ref={clinicNameRef}
                            type="text"
                            value={clinicNameValue}
                            disabled={clinicNameSaving}
                            onChange={(e) => setClinicNameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') { e.preventDefault(); saveClinicName(); }
                              if (e.key === 'Escape') { e.preventDefault(); cancelClinicEdit(); }
                            }}
                            onBlur={saveClinicName}
                            placeholder="Escribe el nombre de tu clínica…"
                            className="flex-1 bg-transparent border-b-2 border-cyan-500/40 focus:border-cyan-500 outline-none text-on-surface font-medium text-lg py-1"
                          />
                        ) : (
                          <button
                            onClick={startClinicEdit}
                            className="flex-1 flex items-center justify-between text-left group"
                          >
                            <span className="font-medium text-on-surface text-lg">
                              {user?.clinic_name || 'Sin nombre · Pulsa para editar'}
                            </span>
                            <AnimatePresence>
                              {(clinicNameHover || !user?.clinic_name) && (
                                <motion.span
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.8 }}
                                  className="flex items-center gap-1 text-xs font-bold text-cyan-600 bg-cyan-500/10 px-3 py-1.5 rounded-full ring-1 ring-cyan-500/20"
                                >
                                  <Icon name="edit" size={14} />
                                  {user?.clinic_name ? 'Editar' : 'Añadir'}
                                </motion.span>
                              )}
                            </AnimatePresence>
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-outline mt-2 ml-1">
                        {clinicNameEditing
                          ? 'Pulsa Enter para guardar · Esc para cancelar'
                          : 'Pulsa sobre el nombre para editarlo'}
                      </p>
                    </div>
                  </GlassPanel>
                )}
                </>
              ) },
              { id: 'activity', label: isFisio ? 'Actividad' : 'Sesiones', content: (
                <>
                <GlassPanel className="p-6 rounded-[32px] card-glow-hover hover-lift shimmer-border relative overflow-hidden">
                  <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gradient-to-br from-cyan-400/15 to-teal-500/10 blur-2xl pointer-events-none" />
                  <div className="relative">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-teal-500/15 to-cyan-400/10 flex items-center justify-center ring-1 ring-cyan-500/20 breathe-teal">
                          <Icon name="groups" size={24} className="icon-accent-cyan animate-breathe-icon" />
                        </div>
                        <div>
                          <h3 className="font-headline-lg-mobile gradient-text-living font-bold">{isFisio ? 'Pacientes Activos Hoy' : 'Sesiones Programadas'}</h3>
                          <p className="text-xs text-outline mt-0.5">
                            {isFisio ? `${activeToday.length} paciente(s) con actividad` : 'Tus próximas sesiones de rehabilitación'}
                          </p>
                        </div>
                      </div>
                    </div>
                    {loadingActivity ? (
                      <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="flex items-center gap-3 p-4 rounded-2xl bg-surface-container-low/40 border divider-teal animate-pulse">
                            <div className="w-10 h-10 rounded-xl bg-surface-variant/30" />
                            <div className="flex-1 space-y-2">
                              <div className="h-3 bg-surface-variant/30 rounded-full w-2/3" />
                              <div className="h-2 bg-surface-variant/20 rounded-full w-1/3" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : isFisio ? (
                      activeToday.length === 0 ? (
                        <p className="text-sm text-on-surface-variant text-center py-8">No hay pacientes activos hoy. Asigna pacientes para ver su actividad.</p>
                      ) : (
                        <div className="space-y-3">
                          {activeToday.map((p, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.07 }}
                              className="flex items-center gap-3 p-4 rounded-2xl bg-surface-container-low/60 border divider-teal hover-lift"
                            >
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/15 to-teal-500/10 flex items-center justify-center ring-1 ring-cyan-500/20 flex-shrink-0">
                                <span className="font-bold text-sm icon-accent-cyan">{p.name.charAt(0)}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm text-on-surface truncate">{p.name}</p>
                                <p className="text-xs text-outline truncate">{p.diagnosis}</p>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="w-2 h-2 rounded-full bg-gradient-to-r from-cyan-400 to-teal-500 pulse-ring" />
                                <span className="text-xs font-bold text-cyan-600">{p.sessionTime}</span>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )
                    ) : (
                      <div className="text-center py-8">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500/15 to-cyan-400/10 flex items-center justify-center ring-1 ring-cyan-500/20 mx-auto mb-3 breathe-teal">
                          <Icon name="event_available" size={28} className="icon-accent-cyan animate-breathe-icon" />
                        </div>
                        <p className="text-sm text-on-surface-variant">Revisa tus ejercicios asignados en el panel principal para ver tus sesiones programadas.</p>
                      </div>
                    )}
                  </div>
                </GlassPanel>
                <div className="flex flex-wrap justify-between items-center gap-4 pt-6">
                  <div className="flex gap-4 text-sm">
                    <AnimatedLink onClick={() => setLegalModal('privacy')} className="text-on-surface-variant">Política de Privacidad</AnimatedLink>
                    <AnimatedLink onClick={() => setLegalModal('terms')} className="text-on-surface-variant">Términos</AnimatedLink>
                    <AnimatedLink onClick={() => setLegalModal('consent')} className="text-on-surface-variant">Consentimiento</AnimatedLink>
                  </div>
                  <button onClick={() => setShowLogoutModal(true)} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-error/10 text-error font-bold hover:bg-error/20 transition-all breathe-badge hover-lift-warm">
                    <Icon name="logout" size={20} /> Cerrar Sesión
                  </button>
                </div>
                </>
              ) },
            ]}
          />
        </div>
      </div>

      <GlassModal isOpen={showLogoutModal} onClose={() => setShowLogoutModal(false)} size="sm">
        <div className="text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-error/10 flex items-center justify-center mx-auto breathe-warm">
            <Icon name="logout" size={28} className="text-error animate-breathe-icon" />
          </div>
          <h3 className="font-headline-lg-mobile text-on-surface font-bold">¿Cerrar Sesión?</h3>
          <p className="text-sm text-on-surface-variant">Tu sesión se cerrará y tendrás que volver a iniciar sesión para acceder a FisioMirror.</p>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowLogoutModal(false)} className="flex-1 px-6 py-3 rounded-xl bg-surface-variant/30 text-on-surface-variant font-bold hover:bg-surface-variant/50 transition-all">
              Cancelar
            </button>
            <button onClick={() => { setShowLogoutModal(false); supabase.auth.signOut(); }} className="flex-1 px-6 py-3 rounded-xl bg-error text-on-error font-bold hover:bg-error/90 transition-all">
              Cerrar Sesión
            </button>
          </div>
        </div>
      </GlassModal>

      <LegalModal isOpen={legalModal !== null} onClose={() => setLegalModal(null)} type={legalModal ?? 'privacy'} />
    </div>
  );
}
