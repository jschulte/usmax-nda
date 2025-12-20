// Core types for the NDA Lifecycle Application

export type NDAStatus = 'Draft' | 'In legal review' | 'Pending approval' | 'Waiting for signature' | 'Executed' | 'Expired' | 'Terminated' | 'Rejected';

export type NDAType =
  | 'MUTUAL'
  | 'ONE_WAY_GOVERNMENT'
  | 'ONE_WAY_COUNTERPARTY'
  | 'VISITOR'
  | 'RESEARCH'
  | 'VENDOR_ACCESS';

export type RiskLevel = 'Low' | 'Medium' | 'High';

export type InformationType = 'PII' | 'Financial data' | 'Technical data' | 'Source code' | 'Facility access' | 'Other';

export type TaskType = 'Review NDA' | 'Approve' | 'Sign' | 'Provide details';

export interface NDA {
  id: string;
  title: string;
  counterparty: string;
  counterpartyContact: string;
  counterpartyEmail: string;
  type: NDAType;
  status: NDAStatus;
  riskLevel: RiskLevel;
  createdDate: string;
  lastUpdated: string;
  effectiveDate?: string;
  expiryDate?: string;
  purpose: string;
  informationTypes: InformationType[];
  sensitivity: RiskLevel;
  systems: string[];
  department: string;
  internalOwner: string;
  legalOwner: string;
  businessOwner: string;
  termLength?: string;
}

export interface Task {
  id: string;
  ndaId: string;
  ndaTitle: string;
  type: TaskType;
  dueDate: string;
  status: string;
  priority: 'Low' | 'Medium' | 'High';
}

export interface Activity {
  id: string;
  ndaId?: string;
  timestamp: string;
  actor: string;
  action: string;
  eventType: string;
  icon: string;
}

export interface Template {
  id: string;
  name: string;
  type: NDAType;
  department: string;
  lastUpdated: string;
  active: boolean;
  description: string;
}

export interface Clause {
  id: string;
  name: string;
  topic: string;
  text: string;
  riskLevel: RiskLevel;
  usageCount: number;
  required: boolean;
}

export interface WorkflowStep {
  id: string;
  name: string;
  status: 'completed' | 'in-progress' | 'pending';
  timestamp?: string;
  actor?: string;
}

export interface WorkflowStepConfig {
  id: string;
  name: string;
  type: 'review' | 'approval' | 'signature' | 'notification' | 'custom';
  assignedRole: string;
  dueDays: number;
  required: boolean;
  order: number;
}

export interface WorkflowRule {
  id: string;
  condition: string;
  conditionField: string;
  conditionOperator: string;
  conditionValue: string;
  action: string;
  actionType: string;
  actionValue: string;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  active: boolean;
  steps: WorkflowStepConfig[];
  rules: WorkflowRule[];
}
