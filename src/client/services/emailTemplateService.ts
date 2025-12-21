import { get } from './api';

export interface EmailTemplateSummary {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function listEmailTemplates(): Promise<{ templates: EmailTemplateSummary[]; count: number }> {
  return get<{ templates: EmailTemplateSummary[]; count: number }>('/api/email-templates');
}
