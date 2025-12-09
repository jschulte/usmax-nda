# Frontend-Backend Integration Guide

**Version:** 1.0  
**Last Updated:** December 8, 2025  
**Purpose:** Complete backend implementation details for all frontend screens

---

## Table of Contents

1. [Overview](#overview)
2. [API Integration Patterns](#api-integration-patterns)
3. [Dashboard Screen](#dashboard-screen)
4. [My NDAs Screen](#my-ndas-screen)
5. [Requests Screen](#requests-screen)
6. [Request Wizard](#request-wizard)
7. [NDA Detail Screen](#nda-detail-screen)
8. [Templates Screen](#templates-screen)
9. [Workflows Screen](#workflows-screen)
10. [Workflow Editor](#workflow-editor)
11. [Reports Screen](#reports-screen)
12. [External Signing Portal](#external-signing-portal)
13. [Profile Screen](#profile-screen)
14. [Settings Screen](#settings-screen)
15. [Real-time Updates](#real-time-updates)
16. [Error Handling](#error-handling)
17. [Caching Strategy](#caching-strategy)
18. [Performance Optimization](#performance-optimization)

---

## Overview

### Architecture Pattern

```
┌─────────────────────────────────────────────────────────────┐
│                    React Frontend                            │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │  Screens   │  │   Hooks    │  │  Services  │            │
│  └──────┬─────┘  └──────┬─────┘  └──────┬─────┘            │
│         │                │                │                  │
│         └────────────────┴────────────────┘                  │
│                          │                                   │
└──────────────────────────┼───────────────────────────────────┘
                           │ HTTP/REST
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway                               │
│              (Authentication, Rate Limiting)                 │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                Backend Services Layer                        │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │ NDA Service│  │   Workflow │  │    User    │            │
│  │            │  │   Engine   │  │  Service   │            │
│  └────────────┘  └────────────┘  └────────────┘            │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              PostgreSQL + Redis + S3                         │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

```typescript
// Frontend
- React 18+ with TypeScript
- React Router for navigation
- TanStack Query (React Query) for data fetching
- Zustand for state management
- Axios for HTTP requests

// Backend (Reference)
- Node.js + Express (or NestJS)
- PostgreSQL for data
- Redis for caching/sessions
- S3 for document storage
```

---

## API Integration Patterns

### 1. Service Layer Pattern

Create API service modules to encapsulate backend communication:

```typescript
// /src/services/api.ts
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

// Create axios instance with defaults
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

### 2. React Query Integration

Use TanStack Query for efficient data fetching and caching:

```typescript
// /src/lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      cacheTime: 1000 * 60 * 30, // 30 minutes
      retry: 3,
      refetchOnWindowFocus: false,
    },
  },
});

// In App.tsx
import { QueryClientProvider } from '@tanstack/react-query';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* Your app */}
    </QueryClientProvider>
  );
}
```

### 3. Custom Hooks Pattern

Create custom hooks for each data operation:

```typescript
// /src/hooks/useNDAs.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ndaService } from '@/services/ndaService';

export function useNDAs(filters?: NDAFilters) {
  return useQuery({
    queryKey: ['ndas', filters],
    queryFn: () => ndaService.list(filters),
  });
}

export function useNDA(id: string) {
  return useQuery({
    queryKey: ['ndas', id],
    queryFn: () => ndaService.getById(id),
    enabled: !!id,
  });
}

export function useCreateNDA() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ndaService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ndas'] });
    },
  });
}
```

---

## Dashboard Screen

### Backend Requirements

**API Endpoints:**

```typescript
GET /api/v1/dashboard/metrics
GET /api/v1/dashboard/recent-activity
GET /api/v1/dashboard/my-tasks
GET /api/v1/dashboard/upcoming-deadlines
```

### API Implementation

#### 1. Dashboard Metrics

```typescript
// Backend: GET /api/v1/dashboard/metrics
app.get('/api/v1/dashboard/metrics', authenticateUser, async (req, res) => {
  const userId = req.user.id;
  const userRoles = req.user.roles;
  
  // Build query based on user permissions
  const whereClause = buildPermissionFilter(userId, userRoles);
  
  const [
    totalNDAs,
    activeNDAs,
    pendingApprovals,
    expiringNDAs,
    myTasks
  ] = await Promise.all([
    db.ndas.count({ where: whereClause }),
    db.ndas.count({ where: { ...whereClause, status: 'executed' } }),
    db.ndas.count({ where: { ...whereClause, status: 'pending_approval' } }),
    db.ndas.count({ 
      where: { 
        ...whereClause, 
        status: 'executed',
        expiry_date: {
          [Op.between]: [new Date(), addDays(new Date(), 90)]
        }
      } 
    }),
    db.tasks.count({ 
      where: { 
        assigned_to: userId, 
        status: 'pending' 
      } 
    })
  ]);
  
  res.json({
    success: true,
    data: {
      totalNDAs,
      activeNDAs,
      pendingApprovals,
      expiringNDAs,
      myTasks,
      timestamp: new Date()
    }
  });
});

// Helper function
function buildPermissionFilter(userId, roles) {
  if (roles.includes('admin') || roles.includes('super_admin')) {
    return {}; // No filter - can see all
  }
  
  if (roles.includes('manager')) {
    return {
      [Op.or]: [
        { created_by: userId },
        { department: req.user.department }
      ]
    };
  }
  
  // Default: only user's own NDAs
  return { created_by: userId };
}
```

**Response Format:**

```json
{
  "success": true,
  "data": {
    "totalNDAs": 156,
    "activeNDAs": 89,
    "pendingApprovals": 12,
    "expiringNDAs": 8,
    "myTasks": 5,
    "timestamp": "2025-12-08T10:30:00Z"
  },
  "meta": {
    "timestamp": "2025-12-08T10:30:00Z",
    "version": "v1"
  }
}
```

#### 2. Recent Activity

```typescript
// Backend: GET /api/v1/dashboard/recent-activity
app.get('/api/v1/dashboard/recent-activity', authenticateUser, async (req, res) => {
  const userId = req.user.id;
  const limit = parseInt(req.query.limit) || 10;
  
  // Get recent audit events relevant to the user
  const activities = await db.auditEvents.findAll({
    where: {
      [Op.or]: [
        { actor_id: userId },
        { aggregate_id: { 
          [Op.in]: db.sequelize.literal(
            `(SELECT id FROM ndas WHERE created_by = '${userId}' OR internal_owner = '${userId}')`
          )
        }}
      ]
    },
    order: [['occurred_at', 'DESC']],
    limit,
    include: [
      { model: db.users, as: 'actor', attributes: ['id', 'full_name', 'email'] }
    ]
  });
  
  // Format for frontend
  const formattedActivities = activities.map(activity => ({
    id: activity.id,
    type: activity.event_type,
    description: formatActivityDescription(activity),
    timestamp: activity.occurred_at,
    actor: {
      name: activity.actor.full_name,
      email: activity.actor.email
    },
    metadata: activity.event_data
  }));
  
  res.json({
    success: true,
    data: formattedActivities
  });
});

function formatActivityDescription(activity) {
  const templates = {
    'nda_created': 'created NDA {nda_number}',
    'nda_approved': 'approved NDA {nda_number}',
    'nda_rejected': 'rejected NDA {nda_number}',
    'workflow_completed': 'completed workflow for NDA {nda_number}',
    // ... more templates
  };
  
  const template = templates[activity.event_type] || activity.event_type;
  return template.replace(/{(\w+)}/g, (_, key) => activity.event_data[key] || '');
}
```

#### 3. My Tasks

```typescript
// Backend: GET /api/v1/dashboard/my-tasks
app.get('/api/v1/dashboard/my-tasks', authenticateUser, async (req, res) => {
  const userId = req.user.id;
  const status = req.query.status || 'pending';
  
  const tasks = await db.tasks.findAll({
    where: {
      assigned_to: userId,
      status: status
    },
    include: [
      {
        model: db.ndas,
        attributes: ['id', 'nda_number', 'title', 'counterparty_name', 'status']
      },
      {
        model: db.stepExecutions,
        attributes: ['id', 'name', 'type', 'due_date']
      }
    ],
    order: [['due_date', 'ASC']],
    limit: 20
  });
  
  res.json({
    success: true,
    data: tasks
  });
});
```

### Frontend Implementation

```typescript
// /src/services/dashboardService.ts
import { apiClient } from './api';

export const dashboardService = {
  getMetrics: async () => {
    return apiClient.get('/dashboard/metrics');
  },
  
  getRecentActivity: async (limit = 10) => {
    return apiClient.get('/dashboard/recent-activity', { params: { limit } });
  },
  
  getMyTasks: async (status = 'pending') => {
    return apiClient.get('/dashboard/my-tasks', { params: { status } });
  },
  
  getUpcomingDeadlines: async () => {
    return apiClient.get('/dashboard/upcoming-deadlines');
  }
};

// /src/hooks/useDashboard.ts
import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '@/services/dashboardService';

export function useDashboardMetrics() {
  return useQuery({
    queryKey: ['dashboard', 'metrics'],
    queryFn: dashboardService.getMetrics,
    refetchInterval: 60000, // Refresh every minute
  });
}

export function useRecentActivity(limit = 10) {
  return useQuery({
    queryKey: ['dashboard', 'activity', limit],
    queryFn: () => dashboardService.getRecentActivity(limit),
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useMyTasks(status = 'pending') {
  return useQuery({
    queryKey: ['dashboard', 'tasks', status],
    queryFn: () => dashboardService.getMyTasks(status),
    refetchInterval: 30000,
  });
}

// In Dashboard.tsx
import { useDashboardMetrics, useRecentActivity, useMyTasks } from '@/hooks/useDashboard';

export function Dashboard() {
  const { data: metrics, isLoading: metricsLoading } = useDashboardMetrics();
  const { data: activity, isLoading: activityLoading } = useRecentActivity();
  const { data: tasks, isLoading: tasksLoading } = useMyTasks();
  
  if (metricsLoading || activityLoading || tasksLoading) {
    return <LoadingSpinner />;
  }
  
  return (
    <div>
      {/* Render with real data */}
      <MetricsCards metrics={metrics} />
      <ActivityFeed activities={activity} />
      <TasksList tasks={tasks} />
    </div>
  );
}
```

---

## My NDAs Screen

### Backend Requirements

**API Endpoints:**

```typescript
GET  /api/v1/ndas?status={status}&department={dept}&search={query}
GET  /api/v1/ndas/:id
POST /api/v1/ndas/:id/terminate
```

### API Implementation

#### 1. List NDAs with Filters

```typescript
// Backend: GET /api/v1/ndas
app.get('/api/v1/ndas', authenticateUser, async (req, res) => {
  const userId = req.user.id;
  const {
    status,
    department,
    search,
    page = 1,
    per_page = 20,
    sort = 'created_at',
    order = 'desc'
  } = req.query;
  
  // Build where clause
  const whereClause = {
    ...buildPermissionFilter(userId, req.user.roles)
  };
  
  if (status) {
    whereClause.status = status;
  }
  
  if (department) {
    whereClause.department = department;
  }
  
  if (search) {
    whereClause[Op.or] = [
      { nda_number: { [Op.iLike]: `%${search}%` } },
      { title: { [Op.iLike]: `%${search}%` } },
      { counterparty_name: { [Op.iLike]: `%${search}%` } }
    ];
  }
  
  // Execute query with pagination
  const { count, rows } = await db.ndas.findAndCountAll({
    where: whereClause,
    order: [[sort, order]],
    limit: per_page,
    offset: (page - 1) * per_page,
    include: [
      { model: db.users, as: 'creator', attributes: ['id', 'full_name'] },
      { model: db.users, as: 'internal_owner', attributes: ['id', 'full_name'] }
    ]
  });
  
  res.json({
    success: true,
    data: rows,
    pagination: {
      total: count,
      page: parseInt(page),
      per_page: parseInt(per_page),
      total_pages: Math.ceil(count / per_page),
      has_next: page * per_page < count,
      has_prev: page > 1
    }
  });
});
```

**Response Format:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "nda_number": "NDA-2025-0145",
      "title": "Vendor Access NDA",
      "counterparty_name": "Tech Corp Inc",
      "type": "one-way-counterparty",
      "status": "executed",
      "risk_level": "medium",
      "department": "IT Services",
      "effective_date": "2025-01-15",
      "expiry_date": "2027-01-15",
      "created_at": "2025-01-10T10:00:00Z",
      "creator": {
        "id": "uuid",
        "full_name": "Michael Chen"
      },
      "internal_owner": {
        "id": "uuid",
        "full_name": "Sarah Johnson"
      }
    }
  ],
  "pagination": {
    "total": 156,
    "page": 1,
    "per_page": 20,
    "total_pages": 8,
    "has_next": true,
    "has_prev": false
  }
}
```

#### 2. Terminate NDA

```typescript
// Backend: POST /api/v1/ndas/:id/terminate
app.post('/api/v1/ndas/:id/terminate', authenticateUser, async (req, res) => {
  const { id } = req.params;
  const { reason, effective_date } = req.body;
  const userId = req.user.id;
  
  const transaction = await db.sequelize.transaction();
  
  try {
    // Get NDA
    const nda = await db.ndas.findByPk(id, { transaction });
    
    if (!nda) {
      return res.status(404).json({
        success: false,
        error: { message: 'NDA not found' }
      });
    }
    
    // Check permission
    if (!canTerminateNDA(req.user, nda)) {
      return res.status(403).json({
        success: false,
        error: { message: 'Insufficient permissions' }
      });
    }
    
    // Validate current status
    if (nda.status !== 'executed') {
      return res.status(400).json({
        success: false,
        error: { message: 'Only executed NDAs can be terminated' }
      });
    }
    
    // Update NDA
    await nda.update({
      status: 'terminated',
      terminated_at: effective_date || new Date(),
      metadata: {
        ...nda.metadata,
        termination_reason: reason,
        terminated_by: userId
      }
    }, { transaction });
    
    // Create audit event
    await db.auditEvents.create({
      event_type: 'nda_terminated',
      aggregate_type: 'nda',
      aggregate_id: nda.id,
      actor_id: userId,
      event_data: {
        nda_number: nda.nda_number,
        reason,
        effective_date
      },
      occurred_at: new Date()
    }, { transaction });
    
    // Send notifications
    await notificationService.sendNDATerminatedNotification(nda, req.user);
    
    await transaction.commit();
    
    res.json({
      success: true,
      data: nda
    });
    
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

function canTerminateNDA(user, nda) {
  if (user.roles.includes('admin')) return true;
  if (nda.created_by === user.id) return true;
  if (nda.internal_owner === user.id) return true;
  return false;
}
```

### Frontend Implementation

```typescript
// /src/services/ndaService.ts
import { apiClient } from './api';

export interface NDAFilters {
  status?: string;
  department?: string;
  search?: string;
  page?: number;
  per_page?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export const ndaService = {
  list: async (filters?: NDAFilters) => {
    return apiClient.get('/ndas', { params: filters });
  },
  
  getById: async (id: string) => {
    return apiClient.get(`/ndas/${id}`);
  },
  
  terminate: async (id: string, data: { reason: string; effective_date?: string }) => {
    return apiClient.post(`/ndas/${id}/terminate`, data);
  }
};

// /src/hooks/useNDAs.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ndaService, NDAFilters } from '@/services/ndaService';

export function useNDAs(filters?: NDAFilters) {
  return useQuery({
    queryKey: ['ndas', filters],
    queryFn: () => ndaService.list(filters),
    keepPreviousData: true, // Keep old data while fetching new
  });
}

export function useTerminateNDA() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      ndaService.terminate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ndas'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

// In MyNDAs.tsx
import { useNDAs, useTerminateNDA } from '@/hooks/useNDAs';

export function MyNDAs() {
  const [filters, setFilters] = useState<NDAFilters>({
    status: 'all',
    page: 1,
    per_page: 20
  });
  
  const { data, isLoading, error } = useNDAs(filters);
  const terminateMutation = useTerminateNDA();
  
  const handleTerminate = async (id: string, reason: string) => {
    try {
      await terminateMutation.mutateAsync({ id, data: { reason } });
      toast.success('NDA terminated successfully');
    } catch (error) {
      toast.error('Failed to terminate NDA');
    }
  };
  
  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  
  return (
    <div>
      <Filters filters={filters} onChange={setFilters} />
      <NDAsTable 
        ndas={data.data} 
        pagination={data.pagination}
        onTerminate={handleTerminate}
      />
    </div>
  );
}
```

---

## Request Wizard

### Backend Requirements

**API Endpoints:**

```typescript
POST /api/v1/ndas              // Create draft NDA
PUT  /api/v1/ndas/:id          // Update draft
POST /api/v1/ndas/:id/submit   // Submit for review
GET  /api/v1/templates         // Get available templates
POST /api/v1/ndas/:id/documents/upload  // Upload documents
```

### API Implementation

#### 1. Create NDA

```typescript
// Backend: POST /api/v1/ndas
app.post('/api/v1/ndas', authenticateUser, validateRequest(createNDASchema), async (req, res) => {
  const userId = req.user.id;
  const ndaData = req.validatedData;
  
  const transaction = await db.sequelize.transaction();
  
  try {
    // Generate NDA number
    const ndaNumber = await generateNDANumber();
    
    // Create NDA
    const nda = await db.ndas.create({
      ...ndaData,
      nda_number: ndaNumber,
      status: 'draft',
      created_by: userId,
      department: req.user.department,
      created_at: new Date()
    }, { transaction });
    
    // Create audit event
    await db.auditEvents.create({
      event_type: 'nda_created',
      aggregate_type: 'nda',
      aggregate_id: nda.id,
      actor_id: userId,
      event_data: {
        nda_number: ndaNumber,
        title: nda.title,
        counterparty: nda.counterparty_name
      },
      occurred_at: new Date()
    }, { transaction });
    
    await transaction.commit();
    
    res.status(201).json({
      success: true,
      data: nda
    });
    
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

async function generateNDANumber() {
  const year = new Date().getFullYear();
  const prefix = `NDA-${year}-`;
  
  const lastNDA = await db.ndas.findOne({
    where: {
      nda_number: {
        [Op.like]: `${prefix}%`
      }
    },
    order: [['created_at', 'DESC']]
  });
  
  let nextNumber = 1;
  if (lastNDA) {
    const match = lastNDA.nda_number.match(/NDA-\d{4}-(\d+)/);
    if (match) {
      nextNumber = parseInt(match[1]) + 1;
    }
  }
  
  return `${prefix}${String(nextNumber).padStart(4, '0')}`;
}
```

#### 2. Submit for Review

```typescript
// Backend: POST /api/v1/ndas/:id/submit
app.post('/api/v1/ndas/:id/submit', authenticateUser, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  
  const transaction = await db.sequelize.transaction();
  
  try {
    const nda = await db.ndas.findByPk(id, { transaction });
    
    if (!nda) {
      return res.status(404).json({
        success: false,
        error: { message: 'NDA not found' }
      });
    }
    
    // Validate ownership
    if (nda.created_by !== userId) {
      return res.status(403).json({
        success: false,
        error: { message: 'Not authorized' }
      });
    }
    
    // Validate status
    if (nda.status !== 'draft') {
      return res.status(400).json({
        success: false,
        error: { message: 'Only draft NDAs can be submitted' }
      });
    }
    
    // Validate required fields
    const validation = validateNDAForSubmission(nda);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          details: validation.errors
        }
      });
    }
    
    // Find applicable workflow
    const workflow = await workflowService.findApplicableWorkflow(nda);
    
    if (!workflow) {
      return res.status(400).json({
        success: false,
        error: { message: 'No applicable workflow found' }
      });
    }
    
    // Start workflow
    const workflowInstance = await workflowEngine.startWorkflow(nda, workflow.id);
    
    // Update NDA
    await nda.update({
      status: 'in_legal_review',
      submitted_at: new Date(),
      current_workflow_instance_id: workflowInstance.id
    }, { transaction });
    
    // Create audit event
    await db.auditEvents.create({
      event_type: 'nda_submitted',
      aggregate_type: 'nda',
      aggregate_id: nda.id,
      actor_id: userId,
      event_data: {
        nda_number: nda.nda_number,
        workflow_id: workflow.id
      },
      occurred_at: new Date()
    }, { transaction });
    
    await transaction.commit();
    
    res.json({
      success: true,
      data: {
        nda,
        workflow_instance: workflowInstance
      }
    });
    
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

function validateNDAForSubmission(nda) {
  const errors = [];
  
  if (!nda.title) errors.push({ field: 'title', message: 'Title is required' });
  if (!nda.counterparty_name) errors.push({ field: 'counterparty_name', message: 'Counterparty name is required' });
  if (!nda.purpose) errors.push({ field: 'purpose', message: 'Purpose is required' });
  if (!nda.type) errors.push({ field: 'type', message: 'NDA type is required' });
  
  return {
    valid: errors.length === 0,
    errors
  };
}
```

#### 3. Document Upload

```typescript
// Backend: POST /api/v1/ndas/:id/documents/upload
app.post('/api/v1/ndas/:id/documents/upload', 
  authenticateUser, 
  upload.single('file'), 
  async (req, res) => {
    const { id } = req.params;
    const file = req.file;
    const userId = req.user.id;
    
    if (!file) {
      return res.status(400).json({
        success: false,
        error: { message: 'No file uploaded' }
      });
    }
    
    // Validate file type
    const allowedTypes = ['.pdf', '.docx', '.doc'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedTypes.includes(ext)) {
      return res.status(400).json({
        success: false,
        error: { message: `File type ${ext} not allowed` }
      });
    }
    
    // Validate file size (25MB)
    if (file.size > 25 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        error: { message: 'File size exceeds 25MB limit' }
      });
    }
    
    const transaction = await db.sequelize.transaction();
    
    try {
      // Upload to S3
      const s3Key = `ndas/${id}/${Date.now()}-${file.originalname}`;
      const uploadResult = await s3Client.upload({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: s3Key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ServerSideEncryption: 'AES256'
      }).promise();
      
      // Create document record
      const document = await db.documents.create({
        nda_id: id,
        filename: file.originalname,
        file_type: ext,
        file_size: file.size,
        storage_key: s3Key,
        storage_url: uploadResult.Location,
        uploaded_by: userId,
        uploaded_at: new Date()
      }, { transaction });
      
      await transaction.commit();
      
      res.json({
        success: true,
        data: document
      });
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
);
```

### Frontend Implementation

```typescript
// /src/services/ndaService.ts (continued)
export const ndaService = {
  // ... previous methods
  
  create: async (data: CreateNDARequest) => {
    return apiClient.post('/ndas', data);
  },
  
  update: async (id: string, data: Partial<CreateNDARequest>) => {
    return apiClient.put(`/ndas/${id}`, data);
  },
  
  submit: async (id: string) => {
    return apiClient.post(`/ndas/${id}/submit`);
  },
  
  uploadDocument: async (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    return apiClient.post(`/ndas/${id}/documents/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
};

// /src/hooks/useCreateNDA.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ndaService } from '@/services/ndaService';

export function useCreateNDA() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ndaService.create,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ndas'] });
      return data;
    },
  });
}

export function useUpdateNDA(id: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: any) => ndaService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ndas', id] });
      queryClient.invalidateQueries({ queryKey: ['ndas'] });
    },
  });
}

export function useSubmitNDA() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ndaService.submit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ndas'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUploadDocument(ndaId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (file: File) => ndaService.uploadDocument(ndaId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ndas', ndaId, 'documents'] });
    },
  });
}

// In RequestWizard.tsx
import { useCreateNDA, useUpdateNDA, useSubmitNDA } from '@/hooks/useCreateNDA';
import { useNavigate } from 'react-router-dom';

export function RequestWizard() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [ndaId, setNdaId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateNDARequest>({});
  
  const createMutation = useCreateNDA();
  const updateMutation = useUpdateNDA(ndaId || '');
  const submitMutation = useSubmitNDA();
  
  const handleNext = async () => {
    if (currentStep === 1 && !ndaId) {
      // Create draft NDA
      try {
        const result = await createMutation.mutateAsync(formData);
        setNdaId(result.data.id);
        setCurrentStep(2);
      } catch (error) {
        toast.error('Failed to create NDA');
      }
    } else if (ndaId) {
      // Update existing draft
      try {
        await updateMutation.mutateAsync(formData);
        setCurrentStep(currentStep + 1);
      } catch (error) {
        toast.error('Failed to save changes');
      }
    }
  };
  
  const handleSubmit = async () => {
    if (!ndaId) return;
    
    try {
      await submitMutation.mutateAsync(ndaId);
      toast.success('NDA submitted successfully');
      navigate(`/nda/${ndaId}`);
    } catch (error) {
      if (error.response?.data?.error?.details) {
        // Show validation errors
        const errors = error.response.data.error.details;
        errors.forEach((err: any) => {
          toast.error(err.message);
        });
      } else {
        toast.error('Failed to submit NDA');
      }
    }
  };
  
  return (
    <div>
      <WizardSteps currentStep={currentStep} />
      <WizardForm 
        step={currentStep}
        data={formData}
        onChange={setFormData}
      />
      <WizardNavigation 
        onNext={handleNext}
        onSubmit={handleSubmit}
        isLoading={createMutation.isLoading || updateMutation.isLoading || submitMutation.isLoading}
      />
    </div>
  );
}
```

---

## NDA Detail Screen

### Backend Requirements

**API Endpoints:**

```typescript
GET    /api/v1/ndas/:id
GET    /api/v1/ndas/:id/workflow
GET    /api/v1/ndas/:id/timeline
GET    /api/v1/ndas/:id/documents
GET    /api/v1/ndas/:id/comments
POST   /api/v1/ndas/:id/comments
DELETE /api/v1/ndas/:id/documents/:docId
GET    /api/v1/ndas/:id/documents/:docId/download
```

### API Implementation

#### 1. Get NDA Details

```typescript
// Backend: GET /api/v1/ndas/:id
app.get('/api/v1/ndas/:id', authenticateUser, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  
  const nda = await db.ndas.findByPk(id, {
    include: [
      { model: db.users, as: 'creator', attributes: ['id', 'full_name', 'email', 'department'] },
      { model: db.users, as: 'internal_owner', attributes: ['id', 'full_name', 'email'] },
      { model: db.users, as: 'legal_owner', attributes: ['id', 'full_name', 'email'] },
      { model: db.templates, as: 'template', attributes: ['id', 'name'] }
    ]
  });
  
  if (!nda) {
    return res.status(404).json({
      success: false,
      error: { message: 'NDA not found' }
    });
  }
  
  // Check permissions
  if (!canViewNDA(req.user, nda)) {
    return res.status(403).json({
      success: false,
      error: { message: 'Access denied' }
    });
  }
  
  res.json({
    success: true,
    data: nda
  });
});
```

#### 2. Get Workflow Status

```typescript
// Backend: GET /api/v1/ndas/:id/workflow
app.get('/api/v1/ndas/:id/workflow', authenticateUser, async (req, res) => {
  const { id } = req.params;
  
  const workflowInstance = await db.workflowInstances.findOne({
    where: { nda_id: id },
    include: [
      {
        model: db.stepExecutions,
        as: 'steps',
        include: [
          { model: db.users, as: 'assigned_user', attributes: ['id', 'full_name', 'email'] },
          { model: db.users, as: 'completed_user', attributes: ['id', 'full_name', 'email'] }
        ],
        order: [['order_index', 'ASC']]
      }
    ]
  });
  
  if (!workflowInstance) {
    return res.status(404).json({
      success: false,
      error: { message: 'No workflow found for this NDA' }
    });
  }
  
  res.json({
    success: true,
    data: workflowInstance
  });
});
```

#### 3. Get Timeline

```typescript
// Backend: GET /api/v1/ndas/:id/timeline
app.get('/api/v1/ndas/:id/timeline', authenticateUser, async (req, res) => {
  const { id } = req.params;
  
  // Get all audit events for this NDA
  const events = await db.auditEvents.findAll({
    where: {
      [Op.or]: [
        { aggregate_id: id, aggregate_type: 'nda' },
        {
          aggregate_type: 'workflow_instance',
          aggregate_id: {
            [Op.in]: db.sequelize.literal(
              `(SELECT id FROM workflow_instances WHERE nda_id = '${id}')`
            )
          }
        }
      ]
    },
    include: [
      { model: db.users, as: 'actor', attributes: ['id', 'full_name', 'email'] }
    ],
    order: [['occurred_at', 'DESC']]
  });
  
  // Format for timeline display
  const timeline = events.map(event => ({
    id: event.id,
    type: event.event_type,
    title: getEventTitle(event),
    description: getEventDescription(event),
    timestamp: event.occurred_at,
    actor: event.actor,
    metadata: event.event_data
  }));
  
  res.json({
    success: true,
    data: timeline
  });
});

function getEventTitle(event) {
  const titles = {
    'nda_created': 'NDA Created',
    'nda_submitted': 'Submitted for Review',
    'workflow_step_completed': 'Step Completed',
    'nda_approved': 'NDA Approved',
    'nda_rejected': 'NDA Rejected',
    'nda_executed': 'NDA Executed',
    'comment_added': 'Comment Added',
    // ... more event types
  };
  return titles[event.event_type] || event.event_type;
}
```

#### 4. Comments

```typescript
// Backend: GET /api/v1/ndas/:id/comments
app.get('/api/v1/ndas/:id/comments', authenticateUser, async (req, res) => {
  const { id } = req.params;
  
  const comments = await db.comments.findAll({
    where: { nda_id: id },
    include: [
      { model: db.users, as: 'author', attributes: ['id', 'full_name', 'email'] }
    ],
    order: [['created_at', 'DESC']]
  });
  
  res.json({
    success: true,
    data: comments
  });
});

// Backend: POST /api/v1/ndas/:id/comments
app.post('/api/v1/ndas/:id/comments', authenticateUser, async (req, res) => {
  const { id } = req.params;
  const { text, comment_type } = req.body;
  const userId = req.user.id;
  
  const comment = await db.comments.create({
    nda_id: id,
    text,
    comment_type: comment_type || 'note',
    created_by: userId,
    created_at: new Date()
  });
  
  // Get comment with author
  const fullComment = await db.comments.findByPk(comment.id, {
    include: [
      { model: db.users, as: 'author', attributes: ['id', 'full_name', 'email'] }
    ]
  });
  
  // Notify mentioned users (if @ mentions in text)
  const mentions = extractMentions(text);
  if (mentions.length > 0) {
    await notificationService.sendCommentMentionNotifications(fullComment, mentions);
  }
  
  res.status(201).json({
    success: true,
    data: fullComment
  });
});
```

### Frontend Implementation

```typescript
// /src/hooks/useNDADetail.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ndaService } from '@/services/ndaService';

export function useNDADetail(id: string) {
  return useQuery({
    queryKey: ['ndas', id],
    queryFn: () => ndaService.getById(id),
    enabled: !!id,
  });
}

export function useNDAWorkflow(id: string) {
  return useQuery({
    queryKey: ['ndas', id, 'workflow'],
    queryFn: () => ndaService.getWorkflow(id),
    enabled: !!id,
  });
}

export function useNDATimeline(id: string) {
  return useQuery({
    queryKey: ['ndas', id, 'timeline'],
    queryFn: () => ndaService.getTimeline(id),
    enabled: !!id,
  });
}

export function useNDAComments(id: string) {
  return useQuery({
    queryKey: ['ndas', id, 'comments'],
    queryFn: () => ndaService.getComments(id),
    enabled: !!id,
    refetchInterval: 10000, // Refresh every 10 seconds
  });
}

export function useAddComment(ndaId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: { text: string; comment_type?: string }) =>
      ndaService.addComment(ndaId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ndas', ndaId, 'comments'] });
    },
  });
}

// In NDADetail.tsx
import { useParams } from 'react-router-dom';
import { useNDADetail, useNDAWorkflow, useNDATimeline, useNDAComments } from '@/hooks/useNDADetail';

export function NDADetail() {
  const { id } = useParams<{ id: string }>();
  
  const { data: nda, isLoading } = useNDADetail(id!);
  const { data: workflow } = useNDAWorkflow(id!);
  const { data: timeline } = useNDATimeline(id!);
  const { data: comments } = useNDAComments(id!);
  
  if (isLoading) return <LoadingSpinner />;
  if (!nda) return <NotFound />;
  
  return (
    <div>
      <NDAHeader nda={nda.data} />
      <WorkflowProgress workflow={workflow?.data} />
      <NDATabs>
        <DetailsTab nda={nda.data} />
        <TimelineTab events={timeline?.data} />
        <CommentsTab comments={comments?.data} ndaId={id!} />
      </NDATabs>
    </div>
  );
}
```

---

## Profile Screen

### Backend Requirements

**API Endpoints:**

```typescript
GET  /api/v1/users/me
PUT  /api/v1/users/me
POST /api/v1/users/me/change-password
GET  /api/v1/users/me/sessions
POST /api/v1/users/me/sessions/:sessionId/revoke
GET  /api/v1/users/me/activity
```

### API Implementation

```typescript
// Backend: GET /api/v1/users/me
app.get('/api/v1/users/me', authenticateUser, async (req, res) => {
  const userId = req.user.id;
  
  const user = await db.users.findByPk(userId, {
    include: [
      { model: db.roles, as: 'roles' },
      { model: db.users, as: 'manager', attributes: ['id', 'full_name'] }
    ]
  });
  
  res.json({
    success: true,
    data: user
  });
});

// Backend: PUT /api/v1/users/me
app.put('/api/v1/users/me', authenticateUser, async (req, res) => {
  const userId = req.user.id;
  const { full_name, email, phone, bio } = req.body;
  
  const user = await db.users.findByPk(userId);
  
  await user.update({
    full_name,
    email,
    phone,
    bio
  });
  
  res.json({
    success: true,
    data: user
  });
});

// Backend: POST /api/v1/users/me/change-password
app.post('/api/v1/users/me/change-password', authenticateUser, async (req, res) => {
  const userId = req.user.id;
  const { current_password, new_password } = req.body;
  
  const user = await db.users.findByPk(userId);
  
  // Verify current password
  const isValid = await bcrypt.compare(current_password, user.password_hash);
  if (!isValid) {
    return res.status(400).json({
      success: false,
      error: { message: 'Current password is incorrect' }
    });
  }
  
  // Validate new password
  const validation = validatePassword(new_password);
  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      error: { message: 'Password does not meet requirements', details: validation.errors }
    });
  }
  
  // Hash and update
  const passwordHash = await bcrypt.hash(new_password, 10);
  await user.update({ password_hash: passwordHash });
  
  res.json({
    success: true,
    message: 'Password updated successfully'
  });
});
```

---

## Settings Screen

### Backend Requirements

**API Endpoints:**

```typescript
GET  /api/v1/users/me/preferences
PUT  /api/v1/users/me/preferences
GET  /api/v1/users/me/notifications/preferences
PUT  /api/v1/users/me/notifications/preferences
POST /api/v1/users/me/export-data
```

### API Implementation

```typescript
// Backend: GET /api/v1/users/me/preferences
app.get('/api/v1/users/me/preferences', authenticateUser, async (req, res) => {
  const userId = req.user.id;
  
  const preferences = await db.userPreferences.findOne({
    where: { user_id: userId }
  });
  
  res.json({
    success: true,
    data: preferences || getDefaultPreferences()
  });
});

// Backend: PUT /api/v1/users/me/preferences
app.put('/api/v1/users/me/preferences', authenticateUser, async (req, res) => {
  const userId = req.user.id;
  const preferenceData = req.body;
  
  const [preferences] = await db.userPreferences.upsert({
    user_id: userId,
    ...preferenceData
  });
  
  res.json({
    success: true,
    data: preferences
  });
});

// Backend: POST /api/v1/users/me/export-data
app.post('/api/v1/users/me/export-data', authenticateUser, async (req, res) => {
  const userId = req.user.id;
  
  // Queue export job
  const job = await exportQueue.add('user-data-export', {
    userId,
    requestedAt: new Date()
  });
  
  res.json({
    success: true,
    message: 'Export queued. You will receive an email when ready.',
    job_id: job.id
  });
});
```

---

## Real-time Updates

### WebSocket Implementation

```typescript
// Backend: WebSocket server setup
import { Server } from 'socket.io';

const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true
  }
});

// Authentication middleware
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  try {
    const user = await verifyJWT(token);
    socket.data.user = user;
    next();
  } catch (error) {
    next(new Error('Authentication failed'));
  }
});

io.on('connection', (socket) => {
  const userId = socket.data.user.id;
  
  // Join user's personal room
  socket.join(`user:${userId}`);
  
  // Join NDA rooms based on permissions
  socket.on('subscribe:nda', async (ndaId) => {
    const hasAccess = await checkNDAAccess(userId, ndaId);
    if (hasAccess) {
      socket.join(`nda:${ndaId}`);
    }
  });
  
  socket.on('disconnect', () => {
    console.log(`User ${userId} disconnected`);
  });
});

// Emit events from backend services
export function emitNDAUpdate(ndaId, data) {
  io.to(`nda:${ndaId}`).emit('nda:updated', data);
}

export function emitNewComment(ndaId, comment) {
  io.to(`nda:${ndaId}`).emit('comment:added', comment);
}

export function emitTaskAssigned(userId, task) {
  io.to(`user:${userId}`).emit('task:assigned', task);
}
```

### Frontend WebSocket Integration

```typescript
// /src/services/websocket.ts
import { io, Socket } from 'socket.io-client';

class WebSocketService {
  private socket: Socket | null = null;
  
  connect(token: string) {
    this.socket = io(import.meta.env.VITE_WS_URL, {
      auth: { token }
    });
    
    this.socket.on('connect', () => {
      console.log('WebSocket connected');
    });
    
    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });
  }
  
  subscribeToNDA(ndaId: string) {
    this.socket?.emit('subscribe:nda', ndaId);
  }
  
  onNDAUpdate(callback: (data: any) => void) {
    this.socket?.on('nda:updated', callback);
  }
  
  onNewComment(callback: (comment: any) => void) {
    this.socket?.on('comment:added', callback);
  }
  
  onTaskAssigned(callback: (task: any) => void) {
    this.socket?.on('task:assigned', callback);
  }
  
  disconnect() {
    this.socket?.disconnect();
  }
}

export const wsService = new WebSocketService();

// In App.tsx
import { wsService } from '@/services/websocket';

useEffect(() => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    wsService.connect(token);
  }
  
  return () => wsService.disconnect();
}, []);

// In NDADetail.tsx
useEffect(() => {
  wsService.subscribeToNDA(ndaId);
  
  wsService.onNDAUpdate((data) => {
    queryClient.setQueryData(['ndas', ndaId], data);
    toast.info('NDA updated');
  });
  
  wsService.onNewComment((comment) => {
    queryClient.setQueryData(['ndas', ndaId, 'comments'], (old: any) => {
      return [comment, ...old];
    });
  });
}, [ndaId]);
```

---

## Error Handling

### Global Error Handler

```typescript
// /src/lib/errorHandler.ts
import { AxiosError } from 'axios';
import { toast } from 'sonner';

export function handleApiError(error: unknown) {
  if (error instanceof AxiosError) {
    const status = error.response?.status;
    const message = error.response?.data?.error?.message || 'An error occurred';
    
    switch (status) {
      case 400:
        toast.error('Validation Error', { description: message });
        break;
      case 401:
        toast.error('Unauthorized', { description: 'Please log in again' });
        window.location.href = '/login';
        break;
      case 403:
        toast.error('Access Denied', { description: message });
        break;
      case 404:
        toast.error('Not Found', { description: message });
        break;
      case 500:
        toast.error('Server Error', { description: 'Please try again later' });
        break;
      default:
        toast.error('Error', { description: message });
    }
  } else {
    toast.error('Error', { description: 'An unexpected error occurred' });
  }
}

// Usage in components
try {
  await createMutation.mutateAsync(data);
} catch (error) {
  handleApiError(error);
}
```

---

## Caching Strategy

### Cache Configuration

```typescript
// /src/lib/queryClient.ts (extended)
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Global defaults
      staleTime: 1000 * 60 * 5, // 5 minutes
      cacheTime: 1000 * 60 * 30, // 30 minutes
      retry: 3,
      refetchOnWindowFocus: false,
      
      // Custom per-query overrides in hooks:
      // - Dashboard metrics: 1 minute staleTime, auto-refetch
      // - NDA list: 5 minutes staleTime
      // - NDA detail: 10 minutes staleTime
      // - User profile: 30 minutes staleTime
    },
  },
});

// Cache invalidation patterns
export const invalidatePatterns = {
  // When NDA is updated, invalidate all NDA-related queries
  onNDAUpdate: (ndaId: string) => {
    queryClient.invalidateQueries({ queryKey: ['ndas'] });
    queryClient.invalidateQueries({ queryKey: ['ndas', ndaId] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  },
  
  // When task is completed, invalidate task and dashboard queries
  onTaskComplete: () => {
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  },
};
```

---

## Performance Optimization

### 1. Code Splitting

```typescript
// Lazy load screens
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('./screens/Dashboard'));
const NDADetail = lazy(() => import('./screens/NDADetail'));
const Reports = lazy(() => import('./screens/Reports'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/nda/:id" element={<NDADetail />} />
        <Route path="/reports" element={<Reports />} />
      </Routes>
    </Suspense>
  );
}
```

### 2. Pagination

```typescript
// Infinite scroll for large lists
import { useInfiniteQuery } from '@tanstack/react-query';

export function useInfiniteNDAs(filters?: NDAFilters) {
  return useInfiniteQuery({
    queryKey: ['ndas', 'infinite', filters],
    queryFn: ({ pageParam = 1 }) => 
      ndaService.list({ ...filters, page: pageParam }),
    getNextPageParam: (lastPage) => 
      lastPage.pagination.has_next ? lastPage.pagination.page + 1 : undefined,
  });
}

// In component
const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteNDAs();

<InfiniteScroll
  loadMore={fetchNextPage}
  hasMore={hasNextPage}
  isLoading={isFetchingNextPage}
>
  {data?.pages.map(page => 
    page.data.map(nda => <NDACard key={nda.id} nda={nda} />)
  )}
</InfiniteScroll>
```

### 3. Debouncing Search

```typescript
import { useDebouncedValue } from '@/hooks/useDebounce';

export function NDAsSearch() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 500);
  
  const { data } = useNDAs({ search: debouncedSearch });
  
  return <Input value={search} onChange={(e) => setSearch(e.target.value)} />;
}
```

---

## Summary

This integration guide provides:

✅ **Complete API specifications** for each screen
✅ **Request/response formats** with validation
✅ **Frontend service layer** architecture
✅ **React Query integration** patterns
✅ **Real-time updates** via WebSockets
✅ **Error handling** strategies
✅ **Caching optimization** guidelines
✅ **Performance best practices**

All screens now have comprehensive backend implementation details ready for development.
