/**
 * NDA Workflow Progress Component
 *
 * Shows the current status in the NDA workflow and suggests next actions
 * Provides visual feedback on where the user is in the process
 */

import React from 'react';
import { Check, Circle, Clock, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { Card } from './ui/AppCard';
import { Badge } from './ui/AppBadge';
import type { NdaStatus } from '../client/services/ndaService';

interface WorkflowStep {
  key: string;
  label: string;
  description: string;
  status: 'completed' | 'in-progress' | 'pending' | 'blocked';
}

interface NDAWorkflowProgressProps {
  currentStatus: NdaStatus;
  hasDocument?: boolean;
  canApprove?: boolean;
  canSend?: boolean;
  canRouteForApproval?: boolean;
  isCreator?: boolean;
}

export function NDAWorkflowProgress({
  currentStatus,
  hasDocument = false,
  canApprove = false,
  canSend = false,
  canRouteForApproval = false,
  isCreator = false
}: NDAWorkflowProgressProps) {

  // Define workflow steps based on current status
  const getWorkflowSteps = (): WorkflowStep[] => {
    const steps: WorkflowStep[] = [
      {
        key: 'created',
        label: 'Created',
        description: 'NDA draft created',
        status: 'completed'
      },
      {
        key: 'document',
        label: 'Document Ready',
        description: 'NDA document generated',
        status: hasDocument ? 'completed' : 'in-progress'
      },
      {
        key: 'approval',
        label: 'Approval',
        description: 'Awaiting review and approval',
        status: currentStatus === 'CREATED' ? 'pending' :
                currentStatus === 'PENDING_APPROVAL' ? 'in-progress' :
                'completed'
      },
      {
        key: 'sent',
        label: 'Sent',
        description: 'Sent to counterparty',
        status: currentStatus === 'SENT_PENDING_SIGNATURE' || currentStatus === 'FULLY_EXECUTED' ? 'completed' :
                currentStatus === 'IN_REVISION' ? 'completed' :
                'pending'
      },
      {
        key: 'executed',
        label: 'Executed',
        description: 'Fully executed by all parties',
        status: currentStatus === 'FULLY_EXECUTED' ? 'completed' : 'pending'
      }
    ];

    return steps;
  };

  const steps = getWorkflowSteps();

  // Determine next action message
  const getNextAction = (): { message: string; variant: 'info' | 'warning' | 'success' } => {
    if (currentStatus === 'FULLY_EXECUTED') {
      return { message: 'NDA is fully executed ✓', variant: 'success' };
    }

    if (currentStatus === 'EXPIRED' || currentStatus === 'INACTIVE_CANCELED') {
      return { message: 'NDA is inactive', variant: 'warning' };
    }

    if (!hasDocument) {
      return { message: 'Generating document...', variant: 'info' };
    }

    if (currentStatus === 'CREATED' && canRouteForApproval) {
      return { message: 'Next: Route for approval', variant: 'info' };
    }

    if (currentStatus === 'PENDING_APPROVAL') {
      if (canApprove) {
        return { message: 'Action required: Review and approve', variant: 'warning' };
      }
      return { message: 'Waiting for approval', variant: 'info' };
    }

    if (currentStatus === 'SENT_PENDING_SIGNATURE') {
      return { message: 'Waiting for counterparty signature', variant: 'info' };
    }

    if (currentStatus === 'IN_REVISION') {
      return { message: 'In revision - ready to send', variant: 'info' };
    }

    return { message: 'Processing...', variant: 'info' };
  };

  const nextAction = getNextAction();

  const getStatusIcon = (status: WorkflowStep['status']) => {
    switch (status) {
      case 'completed':
        return <Check className="w-4 h-4 text-white" />;
      case 'in-progress':
        return <Clock className="w-4 h-4 text-[var(--color-primary)]" />;
      case 'blocked':
        return <AlertCircle className="w-4 h-4 text-orange-600" />;
      default:
        return <Circle className="w-4 h-4 text-[var(--color-text-muted)]" />;
    }
  };

  const getStatusColor = (status: WorkflowStep['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-[var(--color-success)] border-[var(--color-success)]';
      case 'in-progress':
        return 'bg-blue-100 border-[var(--color-primary)]';
      case 'blocked':
        return 'bg-orange-100 border-orange-600';
      default:
        return 'bg-white border-[var(--color-border)]';
    }
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Workflow Progress</h3>
        <Badge variant={nextAction.variant as any}>
          {nextAction.message}
        </Badge>
      </div>

      <div className="relative">
        {/* Progress bar background */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-[var(--color-border)]" />

        {/* Progress bar fill */}
        <div
          className="absolute top-5 left-0 h-0.5 bg-[var(--color-success)] transition-all duration-500"
          style={{
            width: `${(steps.filter(s => s.status === 'completed').length / steps.length) * 100}%`
          }}
        />

        {/* Steps */}
        <div className="relative flex justify-between">
          {steps.map((step, index) => (
            <div key={step.key} className="flex flex-col items-center" style={{ width: `${100 / steps.length}%` }}>
              <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center mb-2 ${getStatusColor(step.status)}`}>
                {getStatusIcon(step.status)}
              </div>
              <p className={`text-xs font-medium text-center ${
                step.status === 'completed' || step.status === 'in-progress'
                  ? 'text-[var(--color-text-primary)]'
                  : 'text-[var(--color-text-secondary)]'
              }`}>
                {step.label}
              </p>
              <p className="text-xs text-[var(--color-text-muted)] text-center mt-1">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
