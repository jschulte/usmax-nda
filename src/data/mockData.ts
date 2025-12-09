import { NDA, Task, Activity, Template, Clause } from '../types';

export const mockNDAs: NDA[] = [
  {
    id: 'nda-001',
    title: 'TechCorp Software Integration NDA',
    counterparty: 'TechCorp Solutions Inc.',
    counterpartyContact: 'Jane Smith',
    counterpartyEmail: 'jane.smith@techcorp.com',
    type: 'Mutual',
    status: 'In legal review',
    riskLevel: 'Medium',
    createdDate: '2025-11-15',
    lastUpdated: '2025-12-05',
    effectiveDate: '2025-12-01',
    expiryDate: '2026-12-01',
    purpose: 'Software integration project for citizen services portal',
    informationTypes: ['Technical data', 'PII'],
    sensitivity: 'Medium',
    systems: ['Citizen Portal', 'Authentication System'],
    department: 'IT Services',
    internalOwner: 'Michael Chen',
    legalOwner: 'Sarah Johnson',
    businessOwner: 'David Martinez',
    termLength: '1 year'
  },
  {
    id: 'nda-002',
    title: 'GlobalVendor Cloud Services NDA',
    counterparty: 'GlobalVendor LLC',
    counterpartyContact: 'Robert Lee',
    counterpartyEmail: 'robert.lee@globalvendor.com',
    type: 'One-way government disclosing',
    status: 'Waiting for signature',
    riskLevel: 'High',
    createdDate: '2025-10-20',
    lastUpdated: '2025-12-04',
    effectiveDate: '2025-11-15',
    expiryDate: '2027-11-15',
    purpose: 'Cloud infrastructure evaluation and migration',
    informationTypes: ['Financial data', 'Technical data', 'PII'],
    sensitivity: 'High',
    systems: ['Financial System', 'HR Database', 'Cloud Infrastructure'],
    department: 'Infrastructure',
    internalOwner: 'Emily Rodriguez',
    legalOwner: 'Sarah Johnson',
    businessOwner: 'James Wilson',
    termLength: '2 years'
  },
  {
    id: 'nda-003',
    title: 'University Research Partnership',
    counterparty: 'State University Research Lab',
    counterpartyContact: 'Dr. Amanda White',
    counterpartyEmail: 'a.white@stateuniversity.edu',
    type: 'Research',
    status: 'Executed',
    riskLevel: 'Low',
    createdDate: '2025-09-01',
    lastUpdated: '2025-09-20',
    effectiveDate: '2025-09-15',
    expiryDate: '2026-09-15',
    purpose: 'Joint research on public health data analytics',
    informationTypes: ['Technical data'],
    sensitivity: 'Low',
    systems: ['Research Database'],
    department: 'Health Services',
    internalOwner: 'Dr. Lisa Brown',
    legalOwner: 'Sarah Johnson',
    businessOwner: 'Dr. Thomas Anderson',
    termLength: '1 year'
  },
  {
    id: 'nda-004',
    title: 'Facility Access - Construction Vendor',
    counterparty: 'BuildRight Construction',
    counterpartyContact: 'Mark Thompson',
    counterpartyEmail: 'mark.thompson@buildright.com',
    type: 'Visitor',
    status: 'Pending approval',
    riskLevel: 'Low',
    createdDate: '2025-12-01',
    lastUpdated: '2025-12-06',
    purpose: 'Access to secure facilities for renovation project',
    informationTypes: ['Facility access'],
    sensitivity: 'Low',
    systems: ['Building Access Control'],
    department: 'Facilities Management',
    internalOwner: 'Carlos Garcia',
    legalOwner: 'Sarah Johnson',
    businessOwner: 'Patricia Lee'
  },
  {
    id: 'nda-005',
    title: 'DataSecure Cybersecurity Assessment',
    counterparty: 'DataSecure Consultants',
    counterpartyContact: 'Jessica Park',
    counterpartyEmail: 'j.park@datasecure.com',
    type: 'Vendor access',
    status: 'Expired',
    riskLevel: 'High',
    createdDate: '2024-06-15',
    lastUpdated: '2024-12-20',
    effectiveDate: '2024-07-01',
    expiryDate: '2025-07-01',
    purpose: 'Security audit and penetration testing',
    informationTypes: ['Technical data', 'Source code', 'PII'],
    sensitivity: 'High',
    systems: ['All IT Systems'],
    department: 'Information Security',
    internalOwner: 'Kevin Wu',
    legalOwner: 'Sarah Johnson',
    businessOwner: 'Jennifer Davis',
    termLength: '1 year'
  }
];

export const mockTasks: Task[] = [
  {
    id: 'task-001',
    ndaId: 'nda-001',
    ndaTitle: 'TechCorp Software Integration NDA',
    type: 'Review NDA',
    dueDate: '2025-12-09',
    status: 'In legal review',
    priority: 'High'
  },
  {
    id: 'task-002',
    ndaId: 'nda-002',
    ndaTitle: 'GlobalVendor Cloud Services NDA',
    type: 'Sign',
    dueDate: '2025-12-08',
    status: 'Waiting for signature',
    priority: 'High'
  },
  {
    id: 'task-003',
    ndaId: 'nda-004',
    ndaTitle: 'Facility Access - Construction Vendor',
    type: 'Approve',
    dueDate: '2025-12-10',
    status: 'Pending approval',
    priority: 'Medium'
  },
  {
    id: 'task-004',
    ndaId: 'nda-006',
    ndaTitle: 'Marketing Agency Services NDA',
    type: 'Provide details',
    dueDate: '2025-12-12',
    status: 'Draft',
    priority: 'Low'
  }
];

export const mockActivities: Activity[] = [
  {
    id: 'act-001',
    ndaId: 'nda-003',
    timestamp: '2025-12-07T09:30:00',
    actor: 'Dr. Amanda White',
    action: 'Signed NDA for University Research Partnership',
    eventType: 'signature',
    icon: 'CheckCircle'
  },
  {
    id: 'act-002',
    ndaId: 'nda-001',
    timestamp: '2025-12-07T08:15:00',
    actor: 'Sarah Johnson',
    action: 'Approved TechCorp Software Integration NDA',
    eventType: 'approval',
    icon: 'Check'
  },
  {
    id: 'act-003',
    ndaId: 'nda-002',
    timestamp: '2025-12-06T16:45:00',
    actor: 'James Wilson',
    action: 'Sent GlobalVendor Cloud Services NDA for signature',
    eventType: 'sent',
    icon: 'Send'
  },
  {
    id: 'act-004',
    ndaId: 'nda-004',
    timestamp: '2025-12-06T14:20:00',
    actor: 'Carlos Garcia',
    action: 'Submitted new request: Facility Access - Construction Vendor',
    eventType: 'created',
    icon: 'FileText'
  },
  {
    id: 'act-005',
    ndaId: 'nda-001',
    timestamp: '2025-12-05T11:00:00',
    actor: 'Michael Chen',
    action: 'Added comment to TechCorp Software Integration NDA',
    eventType: 'comment',
    icon: 'MessageSquare'
  }
];

export const mockTemplates: Template[] = [
  {
    id: 'tmpl-001',
    name: 'Standard Mutual NDA',
    type: 'Mutual',
    department: 'All Departments',
    lastUpdated: '2025-10-15',
    active: true,
    description: 'Standard bilateral confidentiality agreement for mutual disclosure'
  },
  {
    id: 'tmpl-002',
    name: 'Government Disclosing NDA',
    type: 'One-way government disclosing',
    department: 'All Departments',
    lastUpdated: '2025-11-01',
    active: true,
    description: 'One-way NDA where government discloses confidential information'
  },
  {
    id: 'tmpl-003',
    name: 'Visitor NDA - Short Form',
    type: 'Visitor',
    department: 'Facilities Management',
    lastUpdated: '2025-09-20',
    active: true,
    description: 'Brief NDA for facility visitors and contractors'
  },
  {
    id: 'tmpl-004',
    name: 'Research Collaboration NDA',
    type: 'Research',
    department: 'Health Services',
    lastUpdated: '2025-08-10',
    active: true,
    description: 'NDA template for academic and research partnerships'
  },
  {
    id: 'tmpl-005',
    name: 'Vendor Access Agreement',
    type: 'Vendor access',
    department: 'IT Services',
    lastUpdated: '2025-07-25',
    active: false,
    description: 'Legacy vendor access template (replaced by tmpl-006)'
  }
];

export const mockClauses: Clause[] = [
  {
    id: 'clause-001',
    name: 'Definition of Confidential Information',
    topic: 'Definitions',
    text: 'Confidential Information means any information disclosed by one party to the other...',
    riskLevel: 'Low',
    usageCount: 245,
    required: true
  },
  {
    id: 'clause-002',
    name: 'Non-Disclosure Obligation',
    topic: 'Confidentiality',
    text: 'The Receiving Party agrees to hold all Confidential Information in strict confidence...',
    riskLevel: 'Low',
    usageCount: 238,
    required: true
  },
  {
    id: 'clause-003',
    name: 'Data Retention and Destruction',
    topic: 'Data retention',
    text: 'Upon termination or expiration of this Agreement, the Receiving Party shall...',
    riskLevel: 'Medium',
    usageCount: 187,
    required: true
  },
  {
    id: 'clause-004',
    name: 'Export Control Compliance',
    topic: 'Export control',
    text: 'The parties acknowledge that certain Confidential Information may be subject to...',
    riskLevel: 'High',
    usageCount: 45,
    required: false
  },
  {
    id: 'clause-005',
    name: 'Intellectual Property Rights',
    topic: 'IP',
    text: 'Nothing in this Agreement grants any license or right to any intellectual property...',
    riskLevel: 'Medium',
    usageCount: 156,
    required: true
  },
  {
    id: 'clause-006',
    name: 'Survival of Obligations',
    topic: 'Term',
    text: 'The obligations of confidentiality shall survive termination of this Agreement...',
    riskLevel: 'Low',
    usageCount: 201,
    required: true
  }
];
