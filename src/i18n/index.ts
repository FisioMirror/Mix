import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  es: {
    translation: {
      common: {
        appName: 'FisioMirror',
        welcome: 'Bienvenido',
        login: 'Iniciar Sesión',
        logout: 'Cerrar Sesión',
        save: 'Guardar',
        cancel: 'Cancelar',
        close: 'Cerrar',
        loading: 'Cargando',
        error: 'Error',
        success: 'Éxito',
        search: 'Buscar',
        back: 'Volver',
        next: 'Siguiente',
        previous: 'Anterior',
        skip: 'Saltar',
        finish: 'Finalizar',
      },
      navigation: {
        dashboard: 'Inicio',
        patients: 'Pacientes',
        exercises: 'Ejercicios',
        stats: 'Estadísticas',
        tools: 'Herramientas',
        profile: 'Perfil',
        settings: 'Configuración',
        aiAssistant: 'Asistente IA',
        arMirror: 'Espejo AR',
      },
      auth: {
        loginTitle: 'Iniciar Sesión',
        email: 'Correo electrónico',
        password: 'Contraseña',
        signIn: 'Entrar',
        signUp: 'Registrarse',
        token: 'Token de acceso',
        selectRole: 'Selecciona tu rol',
        physio: 'Fisioterapeuta',
        patient: 'Paciente',
      },
    },
  },
  en: {
    translation: {
      common: {
        appName: 'FisioMirror',
        welcome: 'Welcome',
        login: 'Sign In',
        logout: 'Sign Out',
        save: 'Save',
        cancel: 'Cancel',
        close: 'Close',
        loading: 'Loading',
        error: 'Error',
        success: 'Success',
        search: 'Search',
        back: 'Back',
        next: 'Next',
        previous: 'Previous',
        skip: 'Skip',
        finish: 'Finish',
      },
      navigation: {
        dashboard: 'Home',
        patients: 'Patients',
        exercises: 'Exercises',
        stats: 'Statistics',
        tools: 'Tools',
        profile: 'Profile',
        settings: 'Settings',
        aiAssistant: 'AI Assistant',
        arMirror: 'AR Mirror',
      },
      auth: {
        loginTitle: 'Sign In',
        email: 'Email',
        password: 'Password',
        signIn: 'Enter',
        signUp: 'Sign Up',
        token: 'Access token',
        selectRole: 'Select your role',
        physio: 'Physiotherapist',
        patient: 'Patient',
      },
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'es',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
