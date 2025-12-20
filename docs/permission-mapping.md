# Permission Mapping

This document maps API routes to the permission checks enforced by the routing layer.
Unless noted, all routes require authentication (`authenticateJWT`) and user context (`attachUserContext`).

Legend:
- **ALL** = require a single permission
- **ANY** = require any permission in the list (`requireAnyPermission`)
- **AUTH** = authenticated user only (no explicit permission middleware on the route)

## Admin & User Management
| Route | Permission |
| --- | --- |
| GET `/api/admin/roles` | **ALL** `admin:manage_users` |
| GET `/api/admin/permissions` | **ALL** `admin:manage_users` |
| GET `/api/admin/users/:id/roles` | **ALL** `admin:manage_users` |
| POST `/api/admin/users/:id/roles` | **ALL** `admin:manage_users` |
| DELETE `/api/admin/users/:id/roles/:roleId` | **ALL** `admin:manage_users` |
| GET `/api/admin/access-export` | **ALL** `admin:manage_users` |
| GET `/api/users` | **ALL** `admin:manage_users` |
| GET `/api/users/:id` | **ALL** `admin:manage_users` |
| POST `/api/users` | **ALL** `admin:manage_users` |
| PUT `/api/users/:id` | **ALL** `admin:manage_users` |
| DELETE `/api/users/:id` | **ALL** `admin:manage_users` |

## Audit Logs
| Route | Permission |
| --- | --- |
| GET `/api/admin/audit-logs` | **ALL** `admin:view_audit_logs` |
| GET `/api/admin/audit-logs/export` | **ALL** `admin:view_audit_logs` |
| GET `/api/ndas/:id/audit-trail` | **ANY** `nda:view`, `nda:create`, `nda:update` |

## Agency Management
| Route | Permission |
| --- | --- |
| GET `/api/agency-groups` | **ANY** `nda:view`, `nda:create`, `admin:manage_agencies` |
| GET `/api/agency-groups/:id` | **ALL** `admin:manage_agencies` |
| POST `/api/agency-groups` | **ALL** `admin:manage_agencies` |
| PUT `/api/agency-groups/:id` | **ALL** `admin:manage_agencies` |
| DELETE `/api/agency-groups/:id` | **ALL** `admin:manage_agencies` |
| GET `/api/agency-groups/:groupId/subagencies` | **ANY** `nda:view`, `nda:create`, `admin:manage_agencies` |
| GET `/api/subagencies/:id` | **ANY** `nda:view`, `nda:create`, `admin:manage_agencies` |
| POST `/api/agency-groups/:groupId/subagencies` | **ALL** `admin:manage_agencies` |
| PUT `/api/subagencies/:id` | **ALL** `admin:manage_agencies` |
| DELETE `/api/subagencies/:id` | **ALL** `admin:manage_agencies` |
| GET `/api/agency-groups/:id/access` | **ALL** `admin:manage_agencies` |
| POST `/api/agency-groups/:id/access` | **ALL** `admin:manage_agencies` |
| DELETE `/api/agency-groups/:id/access/:contactId` | **ALL** `admin:manage_agencies` |
| GET `/api/subagencies/:id/access` | **ALL** `admin:manage_agencies` |
| POST `/api/subagencies/:id/access` | **ALL** `admin:manage_agencies` |
| DELETE `/api/subagencies/:id/access/:contactId` | **ALL** `admin:manage_agencies` |

## NDA Operations & Documents
| Route | Permission |
| --- | --- |
| GET `/api/ndas/status-info` | **ANY** `nda:view`, `nda:create` |
| GET `/api/ndas/filter-presets` | **ANY** `nda:view`, `nda:create`, `nda:update`, `nda:delete` |
| GET `/api/ndas/export` | **ANY** `nda:view`, `nda:create`, `nda:update`, `nda:delete` |
| GET `/api/ndas` | **ANY** `nda:view`, `nda:create`, `nda:update`, `nda:delete` |
| GET `/api/ndas/company-suggestions` | **ANY** `nda:create`, `nda:update` |
| GET `/api/ndas/company-defaults` | **ANY** `nda:create`, `nda:update` |
| GET `/api/ndas/company-search` | **ANY** `nda:create`, `nda:update` |
| GET `/api/ndas/company-agency` | **ANY** `nda:create`, `nda:update` |
| GET `/api/ndas/agency-suggestions` | **ANY** `nda:create`, `nda:update` |
| GET `/api/ndas/agency-subagencies` | **ANY** `nda:create`, `nda:update` |
| GET `/api/ndas/:id` | **ANY** `nda:view`, `nda:create`, `nda:update`, `nda:delete` |
| POST `/api/ndas` | **ALL** `nda:create` |
| PUT `/api/ndas/:id` | **ALL** `nda:update` |
| PATCH `/api/ndas/:id/status` | **ALL** `nda:mark_status` |
| PATCH `/api/ndas/:id/draft` | **ALL** `nda:update` |
| POST `/api/ndas/:id/clone` | **ALL** `nda:create` |
| POST `/api/ndas/:id/generate-document` | **ANY** `nda:create`, `nda:update` |
| GET `/api/ndas/:id/documents` | **ANY** `nda:view`, `nda:create`, `nda:update` |
| POST `/api/ndas/:id/documents/upload` | **ANY** `nda:create`, `nda:update` |
| PATCH `/api/ndas/documents/:documentId/mark-executed` | **ALL** `nda:update` |
| GET `/api/ndas/documents/:documentId/download-url` | **ANY** `nda:view`, `nda:create`, `nda:update` |
| GET `/api/ndas/:id/documents/download-all` | **ANY** `nda:view`, `nda:create`, `nda:update` |
| GET `/api/ndas/documents/:documentId/download` | **ANY** `nda:view`, `nda:create`, `nda:update` |
| GET `/api/ndas/:id/email-preview` | **ALL** `nda:send_email` |
| POST `/api/ndas/:id/send-email` | **ALL** `nda:send_email` |
| GET `/api/ndas/:id/emails` | **ANY** `nda:view`, `nda:create`, `nda:update` |
| POST `/api/ndas/:id/preview-document` | **ANY** `nda:view`, `nda:create`, `nda:update` |
| POST `/api/ndas/:id/save-edited-document` | **ANY** `nda:create`, `nda:update` |

## Templates
| Route | Permission |
| --- | --- |
| GET `/api/rtf-templates` | **ANY** `nda:view`, `nda:create` |
| GET `/api/rtf-templates/:id` | **ANY** `nda:view`, `nda:create` |
| POST `/api/rtf-templates` | **ALL** `admin:manage_templates` |
| PUT `/api/rtf-templates/:id` | **ALL** `admin:manage_templates` |
| DELETE `/api/rtf-templates/:id` | **ALL** `admin:manage_templates` |

Notes:
- `includeInactive=true` on GET `/api/rtf-templates` is only honored when the user has `admin:manage_templates`.
- Template content is only returned to users with `admin:manage_templates`.

## Contacts & POCs
| Route | Permission |
| --- | --- |
| GET `/api/contacts/internal-users` | **ALL** `nda:view` |
| GET `/api/contacts/internal-users/search` | **ALL** `nda:view` |
| GET `/api/contacts/internal-users/:id` | **ALL** `nda:view` |
| GET `/api/contacts/external/search` | **ALL** `nda:view` |
| POST `/api/contacts/external` | **ALL** `nda:create` |
| GET `/api/contacts/:id` | **ALL** `nda:view` |
| GET `/api/contacts/:id/copy` | **ALL** `nda:view` |
| GET `/api/contacts/validation/rules` | **ALL** `nda:view` |
| GET `/api/contacts/search` | **ALL** `admin:manage_agencies` |

## Notifications
| Route | Permission |
| --- | --- |
| GET `/api/me/notification-preferences` | **AUTH** |
| PUT `/api/me/notification-preferences` | **AUTH** |
| GET `/api/me/subscriptions` | **AUTH** |
| POST `/api/ndas/:id/subscribe` | **ANY** `nda:view`, `nda:create`, `nda:update` |
| DELETE `/api/ndas/:id/subscribe` | **AUTH** (service enforces self/admin) |
| GET `/api/ndas/:id/subscribers` | **ANY** `nda:view`, `nda:update`, `admin:manage_users` |

## Dashboard
| Route | Permission |
| --- | --- |
| GET `/api/dashboard` | **ANY** `nda:view`, `nda:create`, `nda:update` |
| GET `/api/dashboard/config` | **ANY** `nda:view`, `nda:create`, `nda:update` |
