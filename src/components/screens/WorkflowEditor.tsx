import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '../ui/AppCard';
import { Button } from '../ui/AppButton';
import { Input } from '../ui/AppInput';
import { 
  ArrowLeft, 
  Save, 
  Plus, 
  Trash2, 
  GripVertical, 
  ChevronRight,
  GitBranch,
  User,
  Clock,
  AlertCircle,
  Settings
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

// Types
interface WorkflowStep {
  id: string;
  name: string;
  type: 'review' | 'approval' | 'signature' | 'notification' | 'custom';
  assignedRole: string;
  dueDays: number;
  required: boolean;
  order: number;
}

interface WorkflowRule {
  id: string;
  condition: string;
  conditionField: string;
  conditionOperator: string;
  conditionValue: string;
  action: string;
  actionType: string;
  actionValue: string;
}

interface WorkflowData {
  id?: string;
  name: string;
  description: string;
  active: boolean;
  steps: WorkflowStep[];
  rules: WorkflowRule[];
}

// Mock data for dropdown options
const roleOptions = [
  { value: 'legal_reviewer', label: 'Legal Reviewer' },
  { value: 'manager', label: 'Manager' },
  { value: 'department_head', label: 'Department Head' },
  { value: 'security_officer', label: 'Security Officer' },
  { value: 'dpo', label: 'Data Protection Officer' },
  { value: 'executive', label: 'Executive' },
  { value: 'requester', label: 'Requester' },
];

const stepTypes = [
  { value: 'review', label: 'Legal Review', color: 'blue' },
  { value: 'approval', label: 'Approval', color: 'purple' },
  { value: 'signature', label: 'Signature', color: 'green' },
  { value: 'notification', label: 'Notification', color: 'gray' },
  { value: 'custom', label: 'Custom Step', color: 'amber' },
];

const conditionFields = [
  { value: 'type', label: 'NDA Type' },
  { value: 'risk_level', label: 'Risk Level' },
  { value: 'department', label: 'Department' },
  { value: 'information_type', label: 'Information Type' },
  { value: 'duration', label: 'Duration' },
  { value: 'value', label: 'Contract Value' },
];

const operators = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'less_than', label: 'Less Than' },
];

const actionTypes = [
  { value: 'add_step', label: 'Add Step' },
  { value: 'skip_step', label: 'Skip Step' },
  { value: 'assign_to', label: 'Assign To' },
  { value: 'set_due_date', label: 'Set Due Date' },
  { value: 'send_notification', label: 'Send Notification' },
  { value: 'require_approval', label: 'Require Approval' },
];

export function WorkflowEditor() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;
  
  // Initialize workflow data
  const [workflow, setWorkflow] = useState<WorkflowData>({
    id: id,
    name: isEditMode ? 'Standard NDA Approval Flow' : '',
    description: isEditMode ? 'Default approval workflow for all NDA types' : '',
    active: true,
    steps: isEditMode ? [
      {
        id: 'step-1',
        name: 'Legal Review',
        type: 'review',
        assignedRole: 'legal_reviewer',
        dueDays: 3,
        required: true,
        order: 1,
      },
      {
        id: 'step-2',
        name: 'Manager Approval',
        type: 'approval',
        assignedRole: 'manager',
        dueDays: 2,
        required: true,
        order: 2,
      },
      {
        id: 'step-3',
        name: 'External Signature',
        type: 'signature',
        assignedRole: 'requester',
        dueDays: 7,
        required: true,
        order: 3,
      },
    ] : [],
    rules: isEditMode ? [
      {
        id: 'rule-1',
        condition: 'Risk level equals High',
        conditionField: 'risk_level',
        conditionOperator: 'equals',
        conditionValue: 'High',
        action: 'Add Security Review step',
        actionType: 'add_step',
        actionValue: 'security_review',
      },
    ] : [],
  });

  const [showStepDialog, setShowStepDialog] = useState(false);
  const [showRuleDialog, setShowRuleDialog] = useState(false);
  const [editingStep, setEditingStep] = useState<WorkflowStep | null>(null);
  const [editingRule, setEditingRule] = useState<WorkflowRule | null>(null);
  
  // Confirmation dialogs
  const [showDeleteStepConfirm, setShowDeleteStepConfirm] = useState(false);
  const [showDeleteRuleConfirm, setShowDeleteRuleConfirm] = useState(false);
  const [stepToDelete, setStepToDelete] = useState<string | null>(null);
  const [ruleToDelete, setRuleToDelete] = useState<string | null>(null);

  // Step form state
  const [stepForm, setStepForm] = useState({
    name: '',
    type: 'review' as WorkflowStep['type'],
    assignedRole: '',
    dueDays: 3,
    required: true,
  });

  // Rule form state
  const [ruleForm, setRuleForm] = useState({
    conditionField: '',
    conditionOperator: '',
    conditionValue: '',
    actionType: '',
    actionValue: '',
  });

  const handleSave = () => {
    if (!workflow.name.trim()) {
      toast.error('Validation error', {
        description: 'Please enter a workflow name',
      });
      return;
    }

    if (workflow.steps.length === 0) {
      toast.error('Validation error', {
        description: 'Please add at least one workflow step',
      });
      return;
    }

    toast.success(isEditMode ? 'Workflow updated' : 'Workflow created', {
      description: `${workflow.name} has been ${isEditMode ? 'updated' : 'created'} successfully`,
    });
    
    setTimeout(() => {
      navigate('/workflows');
    }, 1000);
  };

  const handleCancel = () => {
    navigate('/workflows');
  };

  const handleAddStep = () => {
    setStepForm({
      name: '',
      type: 'review',
      assignedRole: '',
      dueDays: 3,
      required: true,
    });
    setEditingStep(null);
    setShowStepDialog(true);
  };

  const handleEditStep = (step: WorkflowStep) => {
    setStepForm({
      name: step.name,
      type: step.type,
      assignedRole: step.assignedRole,
      dueDays: step.dueDays,
      required: step.required,
    });
    setEditingStep(step);
    setShowStepDialog(true);
  };

  const handleSaveStep = () => {
    if (!stepForm.name.trim() || !stepForm.assignedRole) {
      toast.error('Validation error', {
        description: 'Please fill in all required fields',
      });
      return;
    }

    if (editingStep) {
      // Update existing step
      setWorkflow(prev => ({
        ...prev,
        steps: prev.steps.map(s => 
          s.id === editingStep.id 
            ? { ...s, ...stepForm }
            : s
        ),
      }));
      toast.success('Step updated', {
        description: 'Workflow step has been updated',
      });
    } else {
      // Add new step
      const newStep: WorkflowStep = {
        id: `step-${Date.now()}`,
        ...stepForm,
        order: workflow.steps.length + 1,
      };
      setWorkflow(prev => ({
        ...prev,
        steps: [...prev.steps, newStep],
      }));
      toast.success('Step added', {
        description: 'New workflow step has been added',
      });
    }

    setShowStepDialog(false);
  };

  const handleDeleteStep = (stepId: string) => {
    setWorkflow(prev => ({
      ...prev,
      steps: prev.steps
        .filter(s => s.id !== stepId)
        .map((s, index) => ({ ...s, order: index + 1 })),
    }));
    toast.success('Step deleted', {
      description: 'Workflow step has been removed',
    });
  };

  const handleMoveStep = (stepId: string, direction: 'up' | 'down') => {
    const stepIndex = workflow.steps.findIndex(s => s.id === stepId);
    if (
      (direction === 'up' && stepIndex === 0) ||
      (direction === 'down' && stepIndex === workflow.steps.length - 1)
    ) {
      return;
    }

    const newSteps = [...workflow.steps];
    const targetIndex = direction === 'up' ? stepIndex - 1 : stepIndex + 1;
    [newSteps[stepIndex], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[stepIndex]];
    
    // Update order
    const reorderedSteps = newSteps.map((s, index) => ({ ...s, order: index + 1 }));
    
    setWorkflow(prev => ({
      ...prev,
      steps: reorderedSteps,
    }));
  };

  const handleAddRule = () => {
    setRuleForm({
      conditionField: '',
      conditionOperator: '',
      conditionValue: '',
      actionType: '',
      actionValue: '',
    });
    setEditingRule(null);
    setShowRuleDialog(true);
  };

  const handleEditRule = (rule: WorkflowRule) => {
    setRuleForm({
      conditionField: rule.conditionField,
      conditionOperator: rule.conditionOperator,
      conditionValue: rule.conditionValue,
      actionType: rule.actionType,
      actionValue: rule.actionValue,
    });
    setEditingRule(rule);
    setShowRuleDialog(true);
  };

  const handleSaveRule = () => {
    if (!ruleForm.conditionField || !ruleForm.conditionOperator || !ruleForm.conditionValue || !ruleForm.actionType) {
      toast.error('Validation error', {
        description: 'Please fill in all required fields',
      });
      return;
    }

    const conditionLabel = `${conditionFields.find(f => f.value === ruleForm.conditionField)?.label} ${operators.find(o => o.value === ruleForm.conditionOperator)?.label.toLowerCase()} ${ruleForm.conditionValue}`;
    const actionLabel = `${actionTypes.find(a => a.value === ruleForm.actionType)?.label}${ruleForm.actionValue ? ': ' + ruleForm.actionValue : ''}`;

    if (editingRule) {
      // Update existing rule
      setWorkflow(prev => ({
        ...prev,
        rules: prev.rules.map(r =>
          r.id === editingRule.id
            ? {
                ...r,
                ...ruleForm,
                condition: conditionLabel,
                action: actionLabel,
              }
            : r
        ),
      }));
      toast.success('Rule updated', {
        description: 'Workflow rule has been updated',
      });
    } else {
      // Add new rule
      const newRule: WorkflowRule = {
        id: `rule-${Date.now()}`,
        ...ruleForm,
        condition: conditionLabel,
        action: actionLabel,
      };
      setWorkflow(prev => ({
        ...prev,
        rules: [...prev.rules, newRule],
      }));
      toast.success('Rule added', {
        description: 'New workflow rule has been added',
      });
    }

    setShowRuleDialog(false);
  };

  const handleDeleteRule = (ruleId: string) => {
    setWorkflow(prev => ({
      ...prev,
      rules: prev.rules.filter(r => r.id !== ruleId),
    }));
    toast.success('Rule deleted', {
      description: 'Workflow rule has been removed',
    });
  };

  const getStepColor = (type: WorkflowStep['type']) => {
    const stepType = stepTypes.find(t => t.value === type);
    const colorMap = {
      blue: 'bg-blue-100 border-blue-600',
      purple: 'bg-purple-100 border-purple-600',
      green: 'bg-green-100 border-green-600',
      gray: 'bg-gray-100 border-gray-600',
      amber: 'bg-amber-100 border-amber-600',
    };
    return colorMap[stepType?.color as keyof typeof colorMap] || colorMap.gray;
  };

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <Button 
          variant="subtle" 
          size="sm" 
          icon={<ArrowLeft className="w-4 h-4" />}
          onClick={() => navigate('/workflows')}
          className="mb-4"
        >
          Back to workflows
        </Button>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
          <h1>{isEditMode ? 'Edit workflow' : 'Create new workflow'}</h1>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleCancel}>
              Cancel
            </Button>
            <Button 
              variant="primary" 
              icon={<Save className="w-5 h-5" />}
              onClick={handleSave}
              disabled={!workflow.name || workflow.steps.length === 0}
            >
              Save workflow
            </Button>
          </div>
        </div>
        <p className="text-[var(--color-text-secondary)]">
          Define approval steps and routing rules for NDA processing
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Basic Settings */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <h3 className="mb-4">Basic Information</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="workflow-name">Workflow Name *</Label>
                <Input
                  id="workflow-name"
                  value={workflow.name}
                  onChange={(e) => setWorkflow(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Standard NDA Approval"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="workflow-description">Description</Label>
                <Textarea
                  id="workflow-description"
                  value={workflow.description}
                  onChange={(e) => setWorkflow(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the purpose of this workflow"
                  rows={4}
                  className="mt-1"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <Label htmlFor="workflow-active">Active Status</Label>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                    Enable this workflow to start using it
                  </p>
                </div>
                <Switch
                  id="workflow-active"
                  checked={workflow.active}
                  onCheckedChange={(checked) => setWorkflow(prev => ({ ...prev, active: checked }))}
                />
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="mb-4">Workflow Statistics</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-[var(--color-border)]">
                <span className="text-sm text-[var(--color-text-secondary)]">Total Steps</span>
                <span className="font-medium">{workflow.steps.length}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[var(--color-border)]">
                <span className="text-sm text-[var(--color-text-secondary)]">Conditional Rules</span>
                <span className="font-medium">{workflow.rules.length}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-[var(--color-text-secondary)]">Average Duration</span>
                <span className="font-medium">
                  {workflow.steps.reduce((sum, step) => sum + step.dueDays, 0)} days
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column - Steps and Rules */}
        <div className="lg:col-span-2 space-y-6">
          {/* Visual Workflow Preview */}
          <Card>
            <h3 className="mb-4">Workflow Preview</h3>
            {workflow.steps.length > 0 ? (
              <div className="p-6 bg-gray-50 rounded-lg overflow-x-auto">
                <div className="flex items-center gap-4 min-w-max">
                  <div className="flex flex-col items-center">
                    <div className="w-32 h-20 bg-white border-2 border-[var(--color-primary)] rounded-lg flex items-center justify-center text-center p-2">
                      <p className="text-sm">Start</p>
                    </div>
                  </div>

                  {workflow.steps.map((step, index) => (
                    <React.Fragment key={step.id}>
                      <ChevronRight className="w-6 h-6 text-[var(--color-text-muted)]" />
                      <div className="flex flex-col items-center">
                        <div className={`w-32 h-20 border-2 rounded-lg flex flex-col items-center justify-center text-center p-2 ${getStepColor(step.type)}`}>
                          <p className="text-xs mb-1">{stepTypes.find(t => t.value === step.type)?.label}</p>
                          <p className="text-sm line-clamp-2">{step.name}</p>
                        </div>
                        <p className="text-xs text-[var(--color-text-muted)] mt-1">
                          {step.dueDays} {step.dueDays === 1 ? 'day' : 'days'}
                        </p>
                      </div>
                    </React.Fragment>
                  ))}

                  <ChevronRight className="w-6 h-6 text-[var(--color-text-muted)]" />
                  <div className="flex flex-col items-center">
                    <div className="w-32 h-20 bg-green-100 border-2 border-green-600 rounded-lg flex items-center justify-center text-center p-2">
                      <p className="text-sm">Complete</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-12 bg-gray-50 rounded-lg text-center">
                <Settings className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-3" />
                <p className="text-[var(--color-text-secondary)] mb-4">No workflow steps configured yet</p>
                <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={handleAddStep}>
                  Add First Step
                </Button>
              </div>
            )}
          </Card>

          {/* Workflow Steps */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3>Workflow Steps</h3>
              <Button 
                variant="secondary" 
                size="sm" 
                icon={<Plus className="w-4 h-4" />}
                onClick={handleAddStep}
              >
                Add Step
              </Button>
            </div>

            {workflow.steps.length > 0 ? (
              <div className="space-y-3">
                {workflow.steps.map((step, index) => (
                  <div
                    key={step.id}
                    className="flex flex-col sm:flex-row sm:items-start gap-3 p-4 border border-[var(--color-border)] rounded-lg hover:border-[var(--color-primary)] transition-colors"
                  >
                    {/* Mobile: Top row with order badge and actions */}
                    <div className="flex items-start justify-between sm:hidden">
                      <div className="w-8 h-8 bg-[var(--color-primary-light)] rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-sm text-[var(--color-primary)]">{step.order}</span>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleMoveStep(step.id, 'up')}
                          disabled={index === 0}
                          className="p-1 hover:bg-gray-100 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <GripVertical className="w-4 h-4 text-[var(--color-text-secondary)]" />
                        </button>
                        <button
                          onClick={() => handleEditStep(step)}
                          className="p-2 hover:bg-gray-100 rounded transition-colors"
                          title="Edit step"
                        >
                          <Settings className="w-4 h-4 text-[var(--color-text-secondary)]" />
                        </button>
                        <button
                          onClick={() => {
                            setStepToDelete(step.id);
                            setShowDeleteStepConfirm(true);
                          }}
                          className="p-2 hover:bg-red-50 rounded transition-colors"
                          title="Delete step"
                        >
                          <Trash2 className="w-4 h-4 text-[var(--color-danger)]" />
                        </button>
                      </div>
                    </div>

                    {/* Desktop: Grip handle */}
                    <div className="hidden sm:flex flex-col gap-1 mt-1">
                      <button
                        onClick={() => handleMoveStep(step.id, 'up')}
                        disabled={index === 0}
                        className="p-1 hover:bg-gray-100 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <GripVertical className="w-4 h-4 text-[var(--color-text-secondary)]" />
                      </button>
                    </div>

                    {/* Desktop: Order badge */}
                    <div className="hidden sm:flex w-8 h-8 bg-[var(--color-primary-light)] rounded-full items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-sm text-[var(--color-primary)]">{step.order}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="flex-1 min-w-0">{step.name}</h4>
                          {step.required && (
                            <span className="inline-flex items-center gap-1 text-xs text-[var(--color-danger)] bg-[var(--color-danger-light)] px-2 py-1 rounded whitespace-nowrap flex-shrink-0">
                              <AlertCircle className="w-3 h-3" />
                              Required
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-xs text-[var(--color-text-secondary)]">
                          <span className="inline-flex items-center gap-1">
                            <Settings className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{stepTypes.find(t => t.value === step.type)?.label}</span>
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <User className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{roleOptions.find(r => r.value === step.assignedRole)?.label}</span>
                          </span>
                          <span className="inline-flex items-center gap-1 whitespace-nowrap">
                            <Clock className="w-3 h-3 flex-shrink-0" />
                            {step.dueDays} {step.dueDays === 1 ? 'day' : 'days'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Desktop: Actions */}
                    <div className="hidden sm:flex gap-1">
                      <button
                        onClick={() => handleEditStep(step)}
                        className="p-2 hover:bg-gray-100 rounded transition-colors"
                        title="Edit step"
                      >
                        <Settings className="w-4 h-4 text-[var(--color-text-secondary)]" />
                      </button>
                      <button
                        onClick={() => {
                          setStepToDelete(step.id);
                          setShowDeleteStepConfirm(true);
                        }}
                        className="p-2 hover:bg-red-50 rounded transition-colors"
                        title="Delete step"
                      >
                        <Trash2 className="w-4 h-4 text-[var(--color-danger)]" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-sm text-[var(--color-text-secondary)]">
                  No workflow steps added yet. Click "Add Step" to get started.
                </p>
              </div>
            )}
          </Card>

          {/* Conditional Rules */}
          <Card>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="mb-1">Conditional Rules</h3>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Define rules to dynamically modify the workflow based on NDA attributes
                </p>
              </div>
              <Button 
                variant="secondary" 
                size="sm" 
                icon={<Plus className="w-4 h-4" />}
                onClick={handleAddRule}
                className="w-full sm:w-auto"
              >
                Add Rule
              </Button>
            </div>

            {workflow.rules.length > 0 ? (
              <div className="space-y-3">
                {workflow.rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex flex-col sm:flex-row sm:items-start gap-3 p-4 border border-[var(--color-border)] rounded-lg hover:border-[var(--color-primary)] transition-colors"
                  >
                    {/* Mobile: Top row with icon and actions */}
                    <div className="flex items-start justify-between sm:hidden">
                      <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <GitBranch className="w-4 h-4 text-amber-700" />
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEditRule(rule)}
                          className="p-2 hover:bg-gray-100 rounded transition-colors"
                          title="Edit rule"
                        >
                          <Settings className="w-4 h-4 text-[var(--color-text-secondary)]" />
                        </button>
                        <button
                          onClick={() => {
                            setRuleToDelete(rule.id);
                            setShowDeleteRuleConfirm(true);
                          }}
                          className="p-2 hover:bg-red-50 rounded transition-colors"
                          title="Delete rule"
                        >
                          <Trash2 className="w-4 h-4 text-[var(--color-danger)]" />
                        </button>
                      </div>
                    </div>

                    {/* Desktop: Icon */}
                    <div className="hidden sm:flex w-8 h-8 bg-amber-100 rounded-full items-center justify-center flex-shrink-0">
                      <GitBranch className="w-4 h-4 text-amber-700" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div>
                          <p className="text-xs text-[var(--color-text-secondary)] mb-1">IF (Condition)</p>
                          <p className="text-sm break-words">{rule.condition}</p>
                        </div>
                        <div>
                          <p className="text-xs text-[var(--color-text-secondary)] mb-1">THEN (Action)</p>
                          <p className="text-sm break-words">{rule.action}</p>
                        </div>
                      </div>
                    </div>

                    {/* Desktop: Actions */}
                    <div className="hidden sm:flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleEditRule(rule)}
                        className="p-2 hover:bg-gray-100 rounded transition-colors"
                        title="Edit rule"
                      >
                        <Settings className="w-4 h-4 text-[var(--color-text-secondary)]" />
                      </button>
                      <button
                        onClick={() => {
                          setRuleToDelete(rule.id);
                          setShowDeleteRuleConfirm(true);
                        }}
                        className="p-2 hover:bg-red-50 rounded transition-colors"
                        title="Delete rule"
                      >
                        <Trash2 className="w-4 h-4 text-[var(--color-danger)]" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <GitBranch className="w-8 h-8 text-[var(--color-text-muted)] mx-auto mb-2" />
                <p className="text-sm text-[var(--color-text-secondary)]">
                  No conditional rules defined. Add rules to create dynamic workflows.
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Step Dialog */}
      <Dialog open={showStepDialog} onOpenChange={setShowStepDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingStep ? 'Edit Workflow Step' : 'Add Workflow Step'}</DialogTitle>
            <DialogDescription>
              Configure a workflow step with role assignment and timing
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="step-name">Step Name *</Label>
              <Input
                id="step-name"
                value={stepForm.name}
                onChange={(e) => setStepForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Legal Review"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="step-type">Step Type *</Label>
              <Select
                value={stepForm.type}
                onValueChange={(value) => setStepForm(prev => ({ ...prev, type: value as WorkflowStep['type'] }))}
              >
                <SelectTrigger id="step-type" className="mt-1">
                  <SelectValue placeholder="Select step type" />
                </SelectTrigger>
                <SelectContent>
                  {stepTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="step-role">Assigned Role *</Label>
              <Select
                value={stepForm.assignedRole}
                onValueChange={(value) => setStepForm(prev => ({ ...prev, assignedRole: value }))}
              >
                <SelectTrigger id="step-role" className="mt-1">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="step-due">Due in (Days) *</Label>
              <Input
                id="step-due"
                type="number"
                min="1"
                value={stepForm.dueDays}
                onChange={(e) => setStepForm(prev => ({ ...prev, dueDays: parseInt(e.target.value) || 1 }))}
                className="mt-1"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <div>
                <Label htmlFor="step-required">Required Step</Label>
                <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                  Step must be completed to proceed
                </p>
              </div>
              <Switch
                id="step-required"
                checked={stepForm.required}
                onCheckedChange={(checked) => setStepForm(prev => ({ ...prev, required: checked }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowStepDialog(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveStep}>
              {editingStep ? 'Update Step' : 'Add Step'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rule Dialog */}
      <Dialog open={showRuleDialog} onOpenChange={setShowRuleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRule ? 'Edit Conditional Rule' : 'Add Conditional Rule'}</DialogTitle>
            <DialogDescription>
              Create a rule to dynamically modify the workflow based on conditions
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label className="mb-2 block">IF (Condition)</Label>
              <div className="grid grid-cols-3 gap-2">
                <Select
                  value={ruleForm.conditionField}
                  onValueChange={(value) => setRuleForm(prev => ({ ...prev, conditionField: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Field" />
                  </SelectTrigger>
                  <SelectContent>
                    {conditionFields.map((field) => (
                      <SelectItem key={field.value} value={field.value}>
                        {field.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={ruleForm.conditionOperator}
                  onValueChange={(value) => setRuleForm(prev => ({ ...prev, conditionOperator: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Operator" />
                  </SelectTrigger>
                  <SelectContent>
                    {operators.map((op) => (
                      <SelectItem key={op.value} value={op.value}>
                        {op.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  value={ruleForm.conditionValue}
                  onChange={(e) => setRuleForm(prev => ({ ...prev, conditionValue: e.target.value }))}
                  placeholder="Value"
                />
              </div>
            </div>

            <div>
              <Label className="mb-2 block">THEN (Action)</Label>
              <div className="grid grid-cols-2 gap-2">
                <Select
                  value={ruleForm.actionType}
                  onValueChange={(value) => setRuleForm(prev => ({ ...prev, actionType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Action" />
                  </SelectTrigger>
                  <SelectContent>
                    {actionTypes.map((action) => (
                      <SelectItem key={action.value} value={action.value}>
                        {action.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  value={ruleForm.actionValue}
                  onChange={(e) => setRuleForm(prev => ({ ...prev, actionValue: e.target.value }))}
                  placeholder="Action value (optional)"
                />
              </div>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-900">
                <strong>Example:</strong> If "Risk Level" "Equals" "High", then "Add Step" "Security Review"
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowRuleDialog(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveRule}>
              {editingRule ? 'Update Rule' : 'Add Rule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Step Confirmation Dialog */}
      <Dialog open={showDeleteStepConfirm} onOpenChange={setShowDeleteStepConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Step Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this step? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowDeleteStepConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (stepToDelete) {
                  handleDeleteStep(stepToDelete);
                }
                setShowDeleteStepConfirm(false);
              }}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete Step
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Rule Confirmation Dialog */}
      <Dialog open={showDeleteRuleConfirm} onOpenChange={setShowDeleteRuleConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Rule Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this rule? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowDeleteRuleConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (ruleToDelete) {
                  handleDeleteRule(ruleToDelete);
                }
                setShowDeleteRuleConfirm(false);
              }}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}