/**
 * FormsContext
 * Manages form state, submission, and language for mobile forms
 * Navigation is now handled by expo-router instead of modal state
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from "react";
import i18n from "../lib/i18n";

export type FormType = "ratings" | "infractions" | null;

export interface SubmissionSummary {
  formType: FormType;
  employeeName: string;
  submittedAt: Date;
  details: Record<string, any>;
}

interface FormsContextType {
  // Form state
  isDirty: boolean;
  isSubmitting: boolean;
  submitError: string | null;

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
  const [isDirty, setIsDirty] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lastSubmission, setLastSubmission] =
    useState<SubmissionSummary | null>(null);
  const [language, setLanguageState] = useState<"en" | "es">("en");

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
    i18n.changeLanguage(lang);
  }, []);

  const value = useMemo(
    () => ({
      isDirty,
      isSubmitting,
      submitError,
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
      isDirty,
      isSubmitting,
      submitError,
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
