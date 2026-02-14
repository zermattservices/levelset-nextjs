/**
 * FormsContext
 * Manages form state, submission, and navigation for mobile forms
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from "react";

export type FormType = "ratings" | "infractions" | null;

export interface SubmissionSummary {
  formType: FormType;
  employeeName: string;
  submittedAt: Date;
  details: Record<string, any>;
}

interface FormsContextType {
  // Active form state
  activeForm: FormType;
  isFormOpen: boolean;
  isDirty: boolean;
  isSubmitting: boolean;
  submitError: string | null;

  // Form navigation
  openForm: (formType: FormType) => void;
  closeForm: () => void;

  // Form state management
  setDirty: (dirty: boolean) => void;
  setSubmitting: (submitting: boolean) => void;
  setSubmitError: (error: string | null) => void;

  // Submission
  lastSubmission: SubmissionSummary | null;
  completeSubmission: (summary: SubmissionSummary) => void;
  clearLastSubmission: () => void;

  // Language
  language: "en" | "es";
  setLanguage: (lang: "en" | "es") => void;
}

const FormsContext = createContext<FormsContextType | undefined>(undefined);

interface FormsProviderProps {
  children: React.ReactNode;
}

export function FormsProvider({ children }: FormsProviderProps) {
  // Form state
  const [activeForm, setActiveForm] = useState<FormType>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lastSubmission, setLastSubmission] = useState<SubmissionSummary | null>(null);
  const [language, setLanguageState] = useState<"en" | "es">("en");

  const isFormOpen = activeForm !== null;

  const openForm = useCallback((formType: FormType) => {
    setActiveForm(formType);
    setIsDirty(false);
    setSubmitError(null);
    setLastSubmission(null);
  }, []);

  const closeForm = useCallback(() => {
    setActiveForm(null);
    setIsDirty(false);
    setIsSubmitting(false);
    setSubmitError(null);
  }, []);

  const setDirty = useCallback((dirty: boolean) => {
    setIsDirty(dirty);
  }, []);

  const setSubmitting = useCallback((submitting: boolean) => {
    setIsSubmitting(submitting);
  }, []);

  const completeSubmission = useCallback((summary: SubmissionSummary) => {
    setLastSubmission(summary);
    setIsDirty(false);
    setIsSubmitting(false);
  }, []);

  const clearLastSubmission = useCallback(() => {
    setLastSubmission(null);
  }, []);

  const setLanguage = useCallback((lang: "en" | "es") => {
    setLanguageState(lang);
  }, []);

  const value = useMemo(
    () => ({
      activeForm,
      isFormOpen,
      isDirty,
      isSubmitting,
      submitError,
      openForm,
      closeForm,
      setDirty,
      setSubmitting,
      setSubmitError,
      lastSubmission,
      completeSubmission,
      clearLastSubmission,
      language,
      setLanguage,
    }),
    [
      activeForm,
      isFormOpen,
      isDirty,
      isSubmitting,
      submitError,
      openForm,
      closeForm,
      setDirty,
      setSubmitting,
      setSubmitError,
      lastSubmission,
      completeSubmission,
      clearLastSubmission,
      language,
      setLanguage,
    ]
  );

  return (
    <FormsContext.Provider value={value}>{children}</FormsContext.Provider>
  );
}

export function useForms() {
  const context = useContext(FormsContext);
  if (context === undefined) {
    throw new Error("useForms must be used within a FormsProvider");
  }
  return context;
}

export default FormsContext;
