/**
 * Workflow Guidance Card
 *
 * Shows users exactly what to do next with their NDA
 * Provides clear explanation of approval requirements and available actions
 */

import React from 'react';
import { Card } from './ui/AppCard';
import { Button } from './ui/AppButton';
import { Badge } from './ui/AppBadge';
import {
  Info,
  AlertCircle,
  Send,
  CheckCircle,
  Clock,
  Users,
  HelpCircle,
  ArrowRight
} from 'lucide-react';
import type { WorkflowGuidance } from '../client/services/workflowService';

interface WorkflowGuidanceCardProps {
  guidance: WorkflowGuidance;
  onRouteForApproval?: () => void;
  onSendDirectly?: () => void;
  onApprove?: () => void;
  loading?: boolean;
}

export function WorkflowGuidanceCard({
  guidance,
  onRouteForApproval,
  onSendDirectly,
  onApprove,
  loading = false
}: WorkflowGuidanceCardProps) {

  const getIcon = () => {
    switch (guidance.nextAction) {
      case 'route_for_approval':
        return <Send className="w-5 h-5 text-orange-600" />;
      case 'awaiting_approval':
        return <Clock className="w-5 h-5 text-blue-600" />;
      case 'ready_to_send':
      case 'send_directly':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      default:
        return <Info className="w-5 h-5 text-gray-600" />;
    }
  };

  const getActionColor = () => {
    switch (guidance.nextAction) {
      case 'route_for_approval':
        return 'bg-orange-50 border-orange-200';
      case 'awaiting_approval':
        return 'bg-blue-50 border-blue-200';
      case 'ready_to_send':
      case 'send_directly':
        return 'bg-green-50 border-green-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <Card>
      <div className="flex items-start gap-3 mb-4">
        {getIcon()}
        <div className="flex-1">
          <h3 className="font-semibold mb-1">Next Step: {guidance.nextActionLabel}</h3>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {guidance.nextActionDescription}
          </p>
        </div>
        {guidance.approvalRequired && (
          <Badge variant="warning">Approval Required</Badge>
        )}
      </div>

      {/* Main guidance message */}
      <div className={`p-4 border rounded-lg ${getActionColor()} mb-4`}>
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p className="text-sm">
            {guidance.guidanceText}
          </p>
        </div>
      </div>

      {/* Warning message (if any) */}
      {guidance.warningText && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-yellow-700 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-800">
              {guidance.warningText}
            </p>
          </div>
        </div>
      )}

      {/* Approvers info */}
      {guidance.approvalRequired && guidance.approvers.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-[var(--color-text-secondary)]" />
            <p className="text-sm font-medium">Who can approve:</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {guidance.approvers.map((approver, index) => (
              <Badge key={index} variant="default">
                {approver}
              </Badge>
            ))}
          </div>
          {guidance.canUserApprove && (
            <p className="text-xs text-green-700 mt-2">
              ✓ You have permission to approve this NDA
            </p>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="space-y-2">
        {guidance.availableActions.canRouteForApproval && onRouteForApproval && (
          <Button
            variant="primary"
            className="w-full"
            icon={<ArrowRight className="w-4 h-4" />}
            onClick={onRouteForApproval}
            disabled={loading}
          >
            {guidance.nextActionLabel}
          </Button>
        )}

        {guidance.availableActions.canSendDirectly && onSendDirectly && (
          <Button
            variant="primary"
            className="w-full"
            icon={<Send className="w-4 h-4" />}
            onClick={onSendDirectly}
            disabled={loading}
          >
            Send Email Directly
          </Button>
        )}

        {guidance.nextAction === 'awaiting_approval' && guidance.canUserApprove && onApprove && (
          <Button
            variant="primary"
            className="w-full"
            icon={<CheckCircle className="w-4 h-4" />}
            onClick={onApprove}
            disabled={loading}
          >
            Approve & Send
          </Button>
        )}

        {/* Optional approval for agencies that don't require it */}
        {!guidance.approvalRequired && guidance.availableActions.canRouteForApproval && onRouteForApproval && (
          <Button
            variant="secondary"
            className="w-full"
            icon={<Users className="w-4 h-4" />}
            onClick={onRouteForApproval}
            disabled={loading}
          >
            Route for Optional Review
          </Button>
        )}
      </div>

      {/* Skip approval option for admins */}
      {guidance.canSkipApproval && guidance.skipApprovalReason && (
        <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
          <div className="flex items-start gap-2">
            <HelpCircle className="w-4 h-4 text-[var(--color-text-secondary)] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-[var(--color-text-secondary)]">
                {guidance.skipApprovalReason}
              </p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                You can send this NDA without approval, but it's recommended to follow the standard workflow.
              </p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
