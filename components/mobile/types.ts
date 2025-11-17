export type MobileFormKey = 'ratings' | 'infractions';

export interface SubmissionSummary {
  form: MobileFormKey;
  employeeName: string;
  detail: string;
  action?: string;
  points?: number | null;
  overallRating?: number | null;
}

export interface FormControlCallbacks {
  setDirty: (dirty: boolean) => void;
  setSubmitDisabled: (disabled: boolean) => void;
  setSubmitting: (submitting: boolean) => void;
  completeSubmission: (summary: SubmissionSummary) => void;
  setSubmitHandler: (handler: () => Promise<void> | void) => void;
}

