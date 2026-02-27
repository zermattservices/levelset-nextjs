'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { TrialModal } from './TrialModal';

interface TrialModalContextValue {
  openModal: () => void;
  closeModal: () => void;
  isOpen: boolean;
}

const TrialModalContext = createContext<TrialModalContextValue | null>(null);

export function TrialModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openModal = useCallback(() => setIsOpen(true), []);
  const closeModal = useCallback(() => setIsOpen(false), []);

  return (
    <TrialModalContext.Provider value={{ openModal, closeModal, isOpen }}>
      {children}
      {isOpen && <TrialModal onClose={closeModal} />}
    </TrialModalContext.Provider>
  );
}

export function useTrialModal(): TrialModalContextValue {
  const context = useContext(TrialModalContext);
  if (!context) {
    throw new Error('useTrialModal must be used within a TrialModalProvider');
  }
  return context;
}
