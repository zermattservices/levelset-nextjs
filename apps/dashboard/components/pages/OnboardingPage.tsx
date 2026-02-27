import * as React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { createSupabaseClient } from '@/util/supabase/component';
import { OnboardingStepperHeader } from '@/components/onboarding/OnboardingStepperHeader';
import { AccountSetupStep } from '@/components/onboarding/AccountSetupStep';
import { OrgStructureStep } from '@/components/onboarding/OrgStructureStep';
import { PositionsStep } from '@/components/onboarding/PositionsStep';
import { DocumentUploadStep } from '@/components/onboarding/DocumentUploadStep';
import { DisciplineStep } from '@/components/onboarding/DisciplineStep';
import { EmployeeImportStep } from '@/components/onboarding/EmployeeImportStep';
import { InviteLeadersStep } from '@/components/onboarding/InviteLeadersStep';
import { CompletionModal } from '@/components/onboarding/CompletionModal';
import { BillingSetupModal } from '@/components/onboarding/BillingSetupModal';
import styles from './OnboardingPage.module.css';

interface OrgRole {
  id: string;
  role_name: string;
  hierarchy_level: number;
  is_leader: boolean;
  color: string;
}

interface SessionData {
  needsSetup: boolean;
  session: {
    id: string;
    current_step: number;
    completed_steps: number[];
    step_data: Record<string, any>;
    completed_at: string | null;
  } | null;
  org: {
    id: string;
    name: string;
    is_multi_unit: boolean;
    trial_ends_at: string;
    onboarding_completed: boolean;
  } | null;
  locations: Array<{ id: string; name: string; location_number: string }>;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  } | null;
  orgRoles: OrgRole[];
}

const STEP_LABELS = [
  'Account Setup',
  'Organization Structure',
  'Positions',
  'Documents',
  'Discipline',
  'Employees',
  'Invite Team',
];

export function OnboardingPage() {
  const router = useRouter();
  const supabase = createSupabaseClient();

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [sessionData, setSessionData] = React.useState<SessionData | null>(null);
  const [currentStep, setCurrentStep] = React.useState(1);
  const [completedSteps, setCompletedSteps] = React.useState<number[]>([]);
  const [accessToken, setAccessToken] = React.useState<string | null>(null);

  // Step 4 → Step 5 analysis data pipeline
  const [analysisData, setAnalysisData] = React.useState<any>(null);

  // Step 6 → Step 7 employee data pipeline
  const [importedLeaders, setImportedLeaders] = React.useState<any[]>([]);

  // Completion modal
  const [showCompletion, setShowCompletion] = React.useState(false);

  // Billing setup gate (before Step 1)
  const [billingComplete, setBillingComplete] = React.useState(false);

  // Get a fresh access token (handles expiry)
  const getFreshToken = async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      setAccessToken(session.access_token);
      return session.access_token;
    }
    // Session expired — redirect to login
    router.push('/signup');
    return null;
  };

  // Check auth and load session
  React.useEffect(() => {
    const init = async () => {
      // Check if returning from Stripe Checkout (billing setup complete)
      if (router.query.billing_complete === 'true') {
        setBillingComplete(true);
        localStorage.setItem('ls_billing_setup_complete', 'true');
        // Clean up URL param
        router.replace('/onboarding', undefined, { shallow: true });
      } else if (typeof window !== 'undefined' && localStorage.getItem('ls_billing_setup_complete') === 'true') {
        setBillingComplete(true);
      }

      const token = await getFreshToken();
      if (!token) return;
      await loadSession(token);
    };

    if (router.isReady) {
      init();
    }
  }, [router.isReady]);

  const loadSession = async (token: string) => {
    try {
      const res = await fetch('/api/onboarding/session', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const body = await res.json();
        setError(body.error || 'Failed to load onboarding session');
        setLoading(false);
        return;
      }

      const data: SessionData = await res.json();
      setSessionData(data);

      if (data.needsSetup) {
        setCurrentStep(1);
        setCompletedSteps([]);
      } else if (data.org?.onboarding_completed) {
        // Onboarding already done — redirect to dashboard
        router.push('/');
        return;
      } else if (data.session?.completed_at && !data.org?.onboarding_completed) {
        // User completed all steps but closed tab before clicking "Go to Dashboard"
        // Re-show the completion modal so they can finalize
        setShowCompletion(true);
      } else if (data.session) {
        setCurrentStep(data.session.current_step);
        setCompletedSteps(data.session.completed_steps || []);

        // Restore analysis data from step_data if resuming past step 4
        if (data.session.step_data?.['4']?.analysisId) {
          // Fetch analysis results for discipline pre-fill
          fetchAnalysisData(token, data.session.step_data['4'].analysisId);
        }

        // Restore leader data from step_data if resuming past step 6
        if (data.session.step_data?.['6']?.employees) {
          extractLeaders(data.session.step_data['6'].employees, data.orgRoles || []);
        }
      } else {
        setCurrentStep(2);
        setCompletedSteps([1]);
      }

      setLoading(false);
    } catch (err) {
      setError('Failed to connect to the server');
      setLoading(false);
    }
  };

  const fetchAnalysisData = async (token: string, analysisId: string) => {
    try {
      const res = await fetch(
        `/api/onboarding/analysis-status?analysisId=${analysisId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'complete') {
          setAnalysisData(data.data);
        }
      }
    } catch {
      // Non-fatal — discipline step will just show defaults
    }
  };

  const extractLeaders = (employees: any[], orgRoles: OrgRole[]) => {
    const leaders = employees.filter((emp: any) => emp.isLeader);
    setImportedLeaders(
      leaders.map((emp: any) => ({
        id: emp.tempId || emp.id,
        firstName: emp.firstName,
        lastName: emp.lastName,
        email: emp.email || '',
        role: emp.role || '',
      }))
    );
  };

  const handleStepComplete = async (step: number, result?: any) => {
    if (step === 1) {
      // Step 1 handled by create-org API — reload session to get new data
      // Clear billing setup flag from localStorage (org is now created)
      localStorage.removeItem('ls_billing_setup_complete');
      const token = await getFreshToken();
      if (token) {
        setLoading(true);
        await loadSession(token);
      }
      return;
    }

    const token = await getFreshToken();
    if (!token) return;

    try {
      // For step 4, capture analysis data to pass to step 5
      if (step === 4 && result?.analysisId) {
        fetchAnalysisData(token, result.analysisId);
      }

      // For step 6, extract leader employees for step 7
      if (step === 6 && result?.employees) {
        extractLeaders(result.employees, sessionData?.orgRoles || []);
      }

      // POST to /api/onboarding/step
      const res = await fetch('/api/onboarding/step', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ step, data: result }),
      });

      if (!res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const body = await res.json();
          throw new Error(body.error || 'Failed to save progress');
        }
        throw new Error(res.status === 401 ? 'Session expired — please refresh' : 'Failed to save progress');
      }

      const data = await res.json();
      setCompletedSteps(data.completedSteps);

      // Update sessionData locally so going back shows saved data
      setSessionData(prev => {
        if (!prev?.session) return prev;
        return {
          ...prev,
          session: {
            ...prev.session,
            completed_steps: data.completedSteps,
            step_data: { ...prev.session.step_data, [step]: result },
            current_step: data.currentStep,
          },
        };
      });

      if (data.isComplete) {
        setShowCompletion(true);
        return;
      }

      setCurrentStep(data.currentStep);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSkipStep = async (step: number) => {
    // Mark step as completed with empty data (skipped)
    await handleStepComplete(step, { skipped: true });
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  if (loading) {
    return (
      <>
        <Head><title>Levelset | Setup</title></Head>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div className={styles.container}>
          <div className={styles.loadingContainer}>
            <div
              style={{
                width: 32,
                height: 32,
                border: '3px solid var(--ls-color-muted-border)',
                borderTopColor: 'var(--ls-color-brand)',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <span className={styles.loadingText}>Loading your setup...</span>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Head><title>Levelset | Setup</title></Head>
        <div className={styles.container}>
          <div className={styles.errorContainer}>
            <span className={styles.errorText}>{error}</span>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setLoading(true);
                if (accessToken) loadSession(accessToken);
              }}
              style={{
                padding: '8px 20px',
                border: '1px solid var(--ls-color-brand)',
                borderRadius: 8,
                backgroundColor: 'transparent',
                color: 'var(--ls-color-brand)',
                fontSize: 14,
                fontWeight: 500,
                fontFamily: '"Satoshi", system-ui, sans-serif',
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </>
    );
  }

  if (showCompletion) {
    return (
      <>
        <Head><title>Levelset | Setup Complete</title></Head>
        <style>{`body { margin: 0; }`}</style>
        <CompletionModal
          accessToken={accessToken!}
          orgId={sessionData?.org?.id || ''}
        />
      </>
    );
  }

  // Billing gate: show billing setup modal before Step 1 if payment not yet collected
  if (sessionData?.needsSetup && !billingComplete) {
    return (
      <>
        <Head><title>Levelset | Start Your Trial</title></Head>
        <style>{`body { margin: 0; }`}</style>
        <BillingSetupModal accessToken={accessToken!} />
      </>
    );
  }

  return (
    <>
      <Head><title>Levelset | Setup</title></Head>
      <style>{`body { margin: 0; }`}</style>

      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <img
              src="/logos/levelset-horizontal-lockup.png"
              alt="Levelset"
              className={styles.logo}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const fallback = e.currentTarget.parentElement?.querySelector(`.${styles.logoFallback}`) as HTMLElement;
                if (fallback) fallback.style.display = 'block';
              }}
            />
            <h1 className={styles.logoFallback}>Levelset</h1>
          </div>
          <div className={styles.headerRight}>
            ~10 min setup
          </div>
        </div>

        {/* Stepper */}
        <div className={styles.stepperSection}>
          <OnboardingStepperHeader
            steps={STEP_LABELS}
            currentStep={currentStep}
            completedSteps={completedSteps}
          />
        </div>

        {/* Step Content */}
        <div className={styles.content}>
          {currentStep === 1 && (
            <AccountSetupStep
              accessToken={accessToken!}
              onComplete={() => handleStepComplete(1)}
            />
          )}
          {currentStep === 2 && sessionData?.org && (
            <OrgStructureStep
              orgId={sessionData.org.id}
              initialData={sessionData.session?.step_data?.['2'] || null}
              onComplete={(data) => handleStepComplete(2, data)}
              onBack={handleBack}
            />
          )}
          {currentStep === 3 && sessionData?.org && (
            <PositionsStep
              orgId={sessionData.org.id}
              locations={sessionData.locations}
              initialData={sessionData.session?.step_data?.['3'] || null}
              onComplete={(data) => handleStepComplete(3, data)}
              onBack={handleBack}
            />
          )}
          {currentStep === 4 && sessionData?.org && (
            <DocumentUploadStep
              accessToken={accessToken!}
              orgId={sessionData.org.id}
              initialData={sessionData.session?.step_data?.['4'] || null}
              onComplete={(data) => handleStepComplete(4, data)}
              onSkip={() => handleSkipStep(4)}
              onBack={handleBack}
            />
          )}
          {currentStep === 5 && sessionData?.org && (
            <DisciplineStep
              orgId={sessionData.org.id}
              analysisData={analysisData}
              initialData={sessionData.session?.step_data?.['5'] || null}
              onComplete={(data) => handleStepComplete(5, data)}
              onSkip={() => handleSkipStep(5)}
              onBack={handleBack}
            />
          )}
          {currentStep === 6 && sessionData?.org && (
            <EmployeeImportStep
              accessToken={accessToken!}
              orgId={sessionData.org.id}
              locationId={sessionData.locations[0]?.id || ''}
              orgRoles={sessionData.orgRoles || []}
              initialData={sessionData.session?.step_data?.['6'] || null}
              onComplete={(data) => handleStepComplete(6, data)}
              onSkip={() => handleSkipStep(6)}
              onBack={handleBack}
            />
          )}
          {currentStep === 7 && sessionData?.org && (
            <InviteLeadersStep
              orgId={sessionData.org.id}
              accessToken={accessToken!}
              leaders={importedLeaders}
              onComplete={(data) => handleStepComplete(7, data)}
              onSkip={() => handleSkipStep(7)}
              onBack={handleBack}
            />
          )}
        </div>
      </div>
    </>
  );
}
