import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Plus, Edit, ChevronRight, GitBranch } from 'lucide-react';
import { toast } from 'sonner';

interface WorkflowRule {
  id: string;
  condition: string;
  action: string;
}

interface Workflow {
  id: string;
  name: string;
  description: string;
  active: boolean;
  rules: WorkflowRule[];
}

const mockWorkflows: Workflow[] = [
  {
    id: 'wf-001',
    name: 'Standard NDA Approval Flow',
    description: 'Default approval workflow for all NDA types',
    active: true,
    rules: [
      { id: 'r1', condition: 'All NDAs', action: 'Route to Legal review' },
      { id: 'r2', condition: 'After legal approval', action: 'Route to Manager approval' },
      { id: 'r3', condition: 'After manager approval', action: 'Send for signature' }
    ]
  },
  {
    id: 'wf-002',
    name: 'High-Risk NDA Enhanced Review',
    description: 'Additional security review for high-risk NDAs',
    active: true,
    rules: [
      { id: 'r4', condition: 'Risk level = High', action: 'Add Security review step' },
      { id: 'r5', condition: 'Information includes PII or Financial data', action: 'Add Data Protection Officer review' },
      { id: 'r6', condition: 'After all reviews complete', action: 'Require executive approval' }
    ]
  },
  {
    id: 'wf-003',
    name: 'Expedited Visitor NDA',
    description: 'Fast-track process for low-risk visitor NDAs',
    active: true,
    rules: [
      { id: 'r7', condition: 'Type = Visitor AND Risk = Low', action: 'Skip manager approval' },
      { id: 'r8', condition: 'Duration < 7 days', action: 'Auto-approve after legal review' }
    ]
  },
  {
    id: 'wf-004',
    name: 'Department-Specific Routing',
    description: 'Route NDAs to designated reviewers by department',
    active: true,
    rules: [
      { id: 'r9', condition: 'Department = IT Services', action: 'Assign to Legal reviewer: Sarah Johnson' },
      { id: 'r10', condition: 'Department = Health Services', action: 'Assign to Legal reviewer: Dr. Thomas Anderson' },
      { id: 'r11', condition: 'Department = Infrastructure', action: 'Assign to Legal reviewer: James Wilson' }
    ]
  }
];

export function Workflows() {
  const navigate = useNavigate();
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  
  const handleCreateWorkflow = () => {
    navigate('/workflows/create');
  };
  
  const handleEditWorkflow = () => {
    if (selectedWorkflow) {
      navigate(`/workflows/edit/${selectedWorkflow.id}`);
    }
  };
  
  const handleAddRule = () => {
    toast.info('Add rule', {
      description: 'Adding a new rule to the workflow...'
    });
  };
  
  const handleEditRule = (rule: WorkflowRule) => {
    toast.info('Edit rule', {
      description: `Editing rule: ${rule.condition}...`
    });
  };
  
  const handleDeactivateWorkflow = () => {
    if (selectedWorkflow?.active) {
      toast.success('Workflow deactivated', {
        description: `${selectedWorkflow.name} has been deactivated.`
      });
    } else {
      toast.success('Workflow deleted', {
        description: `${selectedWorkflow?.name} has been deleted.`
      });
    }
  };
  
  const handleDuplicateWorkflow = () => {
    toast.success('Workflow duplicated', {
      description: `${selectedWorkflow?.name} (Copy) has been created.`
    });
  };
  
  const handleSaveChanges = () => {
    toast.success('Workflow saved', {
      description: `${selectedWorkflow?.name} has been updated successfully.`
    });
  };
  
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="mb-2">Workflows and Approvals</h1>
          <p className="text-[var(--color-text-secondary)]">Configure automated routing rules and approval workflows</p>
        </div>
        <Button variant="primary" icon={<Plus className="w-5 h-5" />} onClick={handleCreateWorkflow}>
          Create workflow
        </Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Workflow List */}
        <div className="lg:col-span-1">
          <Card padding="sm">
            <h3 className="px-3 py-2 mb-2">Workflows</h3>
            <div className="space-y-2">
              {mockWorkflows.map((workflow) => (
                <button
                  key={workflow.id}
                  onClick={() => setSelectedWorkflow(workflow)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedWorkflow?.id === workflow.id
                      ? 'bg-[var(--color-primary-light)] border-2 border-[var(--color-primary)]'
                      : 'border-2 border-transparent hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm pr-2">{workflow.name}</p>
                    {workflow.active && (
                      <Badge variant="status" status="Executed">Active</Badge>
                    )}
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    {workflow.description}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-2">
                    {workflow.rules.length} rules
                  </p>
                </button>
              ))}
            </div>
          </Card>
        </div>
        
        {/* Workflow Detail */}
        <div className="lg:col-span-2">
          {selectedWorkflow ? (
            <Card>
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="mb-2">{selectedWorkflow.name}</h2>
                  <p className="text-sm text-[var(--color-text-secondary)]">{selectedWorkflow.description}</p>
                </div>
                <Button variant="secondary" size="sm" icon={<Edit className="w-4 h-4" />} onClick={handleEditWorkflow}>
                  Edit
                </Button>
              </div>
              
              {/* Visual Flow Diagram */}
              <div className="mb-8 p-6 bg-gray-50 rounded-lg">
                <h3 className="mb-4">Workflow diagram</h3>
                <div className="flex items-center justify-center gap-4 flex-wrap">
                  <div className="flex flex-col items-center">
                    <div className="w-32 h-20 bg-white border-2 border-[var(--color-primary)] rounded-lg flex items-center justify-center text-center p-2">
                      <p className="text-sm">Start</p>
                    </div>
                  </div>
                  
                  <ChevronRight className="w-6 h-6 text-[var(--color-text-muted)]" />
                  
                  <div className="flex flex-col items-center">
                    <div className="w-32 h-20 bg-blue-100 border-2 border-blue-600 rounded-lg flex items-center justify-center text-center p-2">
                      <p className="text-sm">Legal Review</p>
                    </div>
                  </div>
                  
                  <ChevronRight className="w-6 h-6 text-[var(--color-text-muted)]" />
                  
                  {selectedWorkflow.id === 'wf-002' && (
                    <>
                      <div className="flex flex-col items-center">
                        <div className="w-32 h-20 bg-amber-100 border-2 border-amber-600 rounded-lg flex items-center justify-center text-center p-2">
                          <p className="text-sm">Security Review</p>
                        </div>
                      </div>
                      <ChevronRight className="w-6 h-6 text-[var(--color-text-muted)]" />
                    </>
                  )}
                  
                  {selectedWorkflow.id !== 'wf-003' && (
                    <>
                      <div className="flex flex-col items-center">
                        <div className="w-32 h-20 bg-purple-100 border-2 border-purple-600 rounded-lg flex items-center justify-center text-center p-2">
                          <p className="text-sm">Manager Approval</p>
                        </div>
                      </div>
                      <ChevronRight className="w-6 h-6 text-[var(--color-text-muted)]" />
                    </>
                  )}
                  
                  <div className="flex flex-col items-center">
                    <div className="w-32 h-20 bg-green-100 border-2 border-green-600 rounded-lg flex items-center justify-center text-center p-2">
                      <p className="text-sm">Send for Signature</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Rules List */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3>Workflow rules</h3>
                  <Button variant="secondary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={handleAddRule}>
                    Add rule
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {selectedWorkflow.rules.map((rule, index) => (
                    <div
                      key={rule.id}
                      className="flex items-start gap-4 p-4 border border-[var(--color-border)] rounded-lg hover:border-[var(--color-primary)] transition-colors"
                    >
                      <div className="w-8 h-8 bg-[var(--color-primary-light)] rounded-full flex items-center justify-center flex-shrink-0">
                        <GitBranch className="w-4 h-4 text-[var(--color-primary)]" />
                      </div>
                      <div className="flex-1">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-[var(--color-text-secondary)] mb-1">IF (Condition)</p>
                            <p className="text-sm">{rule.condition}</p>
                          </div>
                          <div>
                            <p className="text-xs text-[var(--color-text-secondary)] mb-1">THEN (Action)</p>
                            <p className="text-sm">{rule.action}</p>
                          </div>
                        </div>
                      </div>
                      <button className="p-1 hover:bg-gray-100 rounded transition-colors" onClick={() => handleEditRule(rule)}>
                        <Edit className="w-4 h-4 text-[var(--color-text-secondary)]" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-[var(--color-border)]">
                <Button variant="destructive" onClick={handleDeactivateWorkflow}>
                  {selectedWorkflow.active ? 'Deactivate workflow' : 'Delete workflow'}
                </Button>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={handleDuplicateWorkflow}>Duplicate</Button>
                  <Button variant="primary" onClick={handleSaveChanges}>Save changes</Button>
                </div>
              </div>
            </Card>
          ) : (
            <Card>
              <div className="text-center py-12">
                <GitBranch className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-4" />
                <p className="text-[var(--color-text-secondary)]">Select a workflow to view and edit its configuration</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}