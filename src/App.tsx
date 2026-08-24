import { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Login } from './pages/Login';
import { ResetPassword } from './pages/ResetPassword';
import { SplashScreen } from './components/SplashScreen';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import { ToastProvider } from './components/ui/ToastProvider';
import { GlassToastProvider } from './components/ui/GlassToast';
import { InstallProvider } from './lib/installContext';
import { InstallModal } from './components/ui/InstallPrompt';
import { ScrollToTop } from './components/ScrollToTop';
import { OfflineIndicator } from './components/OfflineIndicator';
import { ProtectedRoute } from './components/ProtectedRoute';
import { FisioLayout } from './components/FisioLayout';
import { PatientLayout } from './components/PatientLayout';
import { useAuthStore } from './stores/authStore';
import { OnboardingTour } from './components/OnboardingTour';
import { hasCompletedOnboarding } from './hooks/useGamification';
import type { CharacterRole } from './types/character.types';

const DashboardFisio = lazy(() => import('./pages/DashboardFisio').then(m => ({ default: m.DashboardFisio })));
const PatientDashboard = lazy(() => import('./pages/PatientDashboard').then(m => ({ default: m.PatientDashboard })));
const PatientsPage = lazy(() => import('./pages/PatientsPage').then(m => ({ default: m.PatientsPage })));
const PatientDetailPage = lazy(() => import('./pages/PatientDetailPage').then(m => ({ default: m.PatientDetailPage })));
const OCRScannerPage = lazy(() => import('./pages/OCRScannerPage').then(m => ({ default: m.OCRScannerPage })));
const TokenGeneratorPage = lazy(() => import('./pages/TokenGeneratorPage').then(m => ({ default: m.TokenGeneratorPage })));
const ExercisesPage = lazy(() => import('./pages/ExercisesPage').then(m => ({ default: m.ExercisesPage })));
const StatsPage = lazy(() => import('./pages/StatsPage').then(m => ({ default: m.StatsPage })));
const ToolsPage = lazy(() => import('./pages/ToolsPage').then(m => ({ default: m.ToolsPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then(m => ({ default: m.ProfilePage })));
const ARMirrorPage = lazy(() => import('./pages/ARMirrorPage').then(m => ({ default: m.ARMirrorPage })));
const CalibrationPage = lazy(() => import('./pages/CalibrationPage').then(m => ({ default: m.CalibrationPage })));
const AIAssistantPage = lazy(() => import('./pages/AIAssistantPage').then(m => ({ default: m.AIAssistantPage })));
const PatientExercisesPage = lazy(() => import('./pages/PatientExercisesPage').then(m => ({ default: m.PatientExercisesPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const NotFound = lazy(() => import('./pages/NotFound').then(m => ({ default: m.NotFound })));

function PageLoader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-teal-500/20"
      >
        <span className="text-white font-black text-xl">F</span>
      </motion.div>
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
            className="w-2 h-2 rounded-full bg-teal-500"
          />
        ))}
      </div>
    </div>
  );
}

function AppRoutes() {
  const user = useAuthStore((s) => s.user);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (user && !hasCompletedOnboarding()) {
      setShowOnboarding(true);
    }
  }, [user]);

  const onboardingRole: CharacterRole = user?.role === 'fisioterapeuta' ? 'physio' : 'patient';

  return (
    <>
    {showOnboarding && user && (
      <OnboardingTour
        role={onboardingRole}
        onComplete={() => setShowOnboarding(false)}
      />
    )}
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Fisioterapeuta routes */}
      <Route path="/dashboard-fisio" element={<ProtectedRoute role="fisioterapeuta"><FisioLayout><Suspense fallback={<PageLoader />}><DashboardFisio /></Suspense></FisioLayout></ProtectedRoute>} />
      <Route path="/patients" element={<ProtectedRoute role="fisioterapeuta"><FisioLayout><Suspense fallback={<PageLoader />}><PatientsPage /></Suspense></FisioLayout></ProtectedRoute>} />
      <Route path="/paciente/:id" element={<ProtectedRoute role="fisioterapeuta"><FisioLayout><Suspense fallback={<PageLoader />}><PatientDetailPage /></Suspense></FisioLayout></ProtectedRoute>} />
      <Route path="/ocr-scanner" element={<ProtectedRoute role="fisioterapeuta"><FisioLayout><Suspense fallback={<PageLoader />}><OCRScannerPage /></Suspense></FisioLayout></ProtectedRoute>} />
      <Route path="/tokens" element={<ProtectedRoute role="fisioterapeuta"><FisioLayout><Suspense fallback={<PageLoader />}><TokenGeneratorPage /></Suspense></FisioLayout></ProtectedRoute>} />
      <Route path="/fisio-exercises" element={<ProtectedRoute role="fisioterapeuta"><FisioLayout><Suspense fallback={<PageLoader />}><ExercisesPage /></Suspense></FisioLayout></ProtectedRoute>} />
      <Route path="/fisio-stats" element={<ProtectedRoute role="fisioterapeuta"><FisioLayout><Suspense fallback={<PageLoader />}><StatsPage /></Suspense></FisioLayout></ProtectedRoute>} />
      <Route path="/tools" element={<ProtectedRoute role="fisioterapeuta"><FisioLayout><Suspense fallback={<PageLoader />}><ToolsPage /></Suspense></FisioLayout></ProtectedRoute>} />
      <Route path="/fisio-profile" element={<ProtectedRoute role="fisioterapeuta"><FisioLayout><Suspense fallback={<PageLoader />}><ProfilePage /></Suspense></FisioLayout></ProtectedRoute>} />
      <Route path="/fisio-settings" element={<ProtectedRoute role="fisioterapeuta"><FisioLayout><Suspense fallback={<PageLoader />}><SettingsPage /></Suspense></FisioLayout></ProtectedRoute>} />
      <Route path="/ar-mirror" element={<ProtectedRoute role="paciente"><PatientLayout><Suspense fallback={<PageLoader />}><ARMirrorPage /></Suspense></PatientLayout></ProtectedRoute>} />

      {/* Paciente routes */}
      <Route path="/dashboard-paciente" element={<ProtectedRoute role="paciente"><PatientLayout><Suspense fallback={<PageLoader />}><PatientDashboard /></Suspense></PatientLayout></ProtectedRoute>} />
      <Route path="/calibration" element={<ProtectedRoute role="paciente"><PatientLayout><Suspense fallback={<PageLoader />}><CalibrationPage /></Suspense></PatientLayout></ProtectedRoute>} />
      <Route path="/exercises" element={<ProtectedRoute role="paciente"><PatientLayout><Suspense fallback={<PageLoader />}><PatientExercisesPage /></Suspense></PatientLayout></ProtectedRoute>} />
      <Route path="/stats" element={<ProtectedRoute role="paciente"><PatientLayout><Suspense fallback={<PageLoader />}><StatsPage /></Suspense></PatientLayout></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute role="paciente"><PatientLayout><Suspense fallback={<PageLoader />}><ProfilePage /></Suspense></PatientLayout></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute role="paciente"><PatientLayout><Suspense fallback={<PageLoader />}><SettingsPage /></Suspense></PatientLayout></ProtectedRoute>} />
      <Route path="/ai-assistant" element={<ProtectedRoute role="paciente"><PatientLayout><Suspense fallback={<PageLoader />}><AIAssistantPage /></Suspense></PatientLayout></ProtectedRoute>} />

      {/* Role-aware redirect */}
      <Route path="/" element={<RoleRedirect />} />
      <Route path="/dashboard" element={<RoleRedirect />} />
      <Route path="*" element={<Suspense fallback={<PageLoader />}><NotFound /></Suspense>} />
    </Routes>
    </>
  );
}

function RoleRedirect() {
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);
  if (!initialized) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'fisioterapeuta' ? '/dashboard-fisio' : '/dashboard-paciente'} replace />;
}

function Router() {
  const initialized = useAuthStore((s) => s.initialized);

  const [splashDone, setSplashDone] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSplashDone(true), 2200);
    return () => clearTimeout(t);
  }, []);

  // Hard fallback: if initialized is still false after 4s, force splash away
  const [forceHideSplash, setForceHideSplash] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setForceHideSplash(true), 4000);
    return () => clearTimeout(t);
  }, []);

  const splashVisible = (!splashDone || !initialized) && !forceHideSplash;

  return (
    <>
      <BrowserRouter>
        <div id="app-root" className="min-h-screen">
          <AppRoutes />
          <ScrollToTop />
          <OfflineIndicator />
          <InstallModal />
        </div>
      </BrowserRouter>
      <AnimatePresence>
        {splashVisible && <SplashScreen key="splash" />}
      </AnimatePresence>
    </>
  );
}

export default function App() {
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <InstallProvider>
          <ToastProvider>
            <GlassToastProvider>
              <NotificationProvider>
                <Router />
              </NotificationProvider>
            </GlassToastProvider>
          </ToastProvider>
        </InstallProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
