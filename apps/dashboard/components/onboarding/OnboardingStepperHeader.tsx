import * as React from 'react';
import { Stepper, Step, StepLabel } from '@mui/material';

interface OnboardingStepperHeaderProps {
  steps: string[];
  currentStep: number; // 1-indexed
  completedSteps: number[];
}

export function OnboardingStepperHeader({
  steps,
  currentStep,
  completedSteps,
}: OnboardingStepperHeaderProps) {
  // MUI Stepper uses 0-indexed activeStep
  const activeIndex = currentStep - 1;

  return (
    <Stepper
      activeStep={activeIndex}
      alternativeLabel
      sx={{
        '& .MuiStepLabel-label': {
          fontFamily: '"Satoshi", system-ui, -apple-system, sans-serif',
          fontSize: '13px',
          fontWeight: 500,
          mt: '8px',
        },
        '& .MuiStepLabel-label.Mui-active': {
          fontWeight: 600,
          color: 'var(--ls-color-brand)',
        },
        '& .MuiStepLabel-label.Mui-completed': {
          color: 'var(--ls-color-success)',
        },
        '& .MuiStepIcon-root': {
          width: 28,
          height: 28,
        },
        '& .MuiStepIcon-root.Mui-active': {
          color: 'var(--ls-color-brand)',
        },
        '& .MuiStepIcon-root.Mui-completed': {
          color: 'var(--ls-color-success)',
        },
        '& .MuiStepConnector-line': {
          borderColor: 'var(--ls-color-muted-border)',
        },
        '& .MuiStepConnector-root.Mui-active .MuiStepConnector-line': {
          borderColor: 'var(--ls-color-brand)',
        },
        '& .MuiStepConnector-root.Mui-completed .MuiStepConnector-line': {
          borderColor: 'var(--ls-color-success)',
        },
      }}
    >
      {steps.map((label, index) => {
        const stepNumber = index + 1;
        const isCompleted = completedSteps.includes(stepNumber);

        return (
          <Step key={label} completed={isCompleted}>
            <StepLabel>{label}</StepLabel>
          </Step>
        );
      })}
    </Stepper>
  );
}
