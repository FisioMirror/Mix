import { createContext, useContext, useEffect, useState, useCallback, useMemo, type ReactNode } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface InstallContextValue {
  isInstalled: boolean;
  isInstallable: boolean;
  modalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  triggerInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
}

const InstallContext = createContext<InstallContextValue>({
  isInstalled: false,
  isInstallable: false,
  modalOpen: false,
  openModal: () => {},
  closeModal: () => {},
  triggerInstall: async () => 'unavailable',
});

export function InstallProvider({ children }: { children: ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(display-mode: standalone)');
    setIsInstalled(mq.matches);
    const onMqChange = (e: MediaQueryListEvent) => setIsInstalled(e.matches);
    mq.addEventListener('change', onMqChange);

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);

    const onInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setModalOpen(false);
    };
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      mq.removeEventListener('change', onMqChange);
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const triggerInstall = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    if (!deferredPrompt) return 'unavailable';
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    return outcome;
  }, [deferredPrompt]);

  const openModal = useCallback(() => setModalOpen(true), []);
  const closeModal = useCallback(() => setModalOpen(false), []);

  const value = useMemo(() => ({
    isInstalled,
    isInstallable: !!deferredPrompt,
    modalOpen,
    openModal,
    closeModal,
    triggerInstall,
  }), [isInstalled, deferredPrompt, modalOpen, openModal, closeModal, triggerInstall]);

  return (
    <InstallContext.Provider value={value}>
      {children}
    </InstallContext.Provider>
  );
}

export const useInstall = () => useContext(InstallContext);
