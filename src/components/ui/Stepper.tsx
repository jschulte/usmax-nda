import React from 'react';
import { Check } from 'lucide-react';

interface Step {
  label: string;
  description?: string;
}

interface StepperProps {
  steps: Step[];
  currentStep: number;
  className?: string;
}

export function Stepper({ steps, currentStep, className = '' }: StepperProps) {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isCompleted = stepNumber < currentStep;
        const isCurrent = stepNumber === currentStep;
        const isPending = stepNumber > currentStep;
        
        return (
          <React.Fragment key={index}>
            <div className="flex flex-col items-center flex-1">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                isCompleted 
                  ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white'
                  : isCurrent
                  ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-white'
                  : 'border-[var(--color-border)] text-[var(--color-text-muted)] bg-white'
              }`}>
                {isCompleted ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <span>{stepNumber}</span>
                )}
              </div>
              <div className="mt-2 text-center">
                <p className={`text-sm ${isCurrent ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'}`}>
                  {step.label}
                </p>
                {step.description && (
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    {step.description}
                  </p>
                )}
              </div>
            </div>
            {index < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mb-8 mx-4 ${
                stepNumber < currentStep ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'
              }`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
