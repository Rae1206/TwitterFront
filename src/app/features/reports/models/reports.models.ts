import { JsonRecord } from '../../../core/api/api.models';


export interface ReportDto extends JsonRecord {
  reportId?: string;
  reporterUserId?: string;
  entityType?: string;
  entityId?: string;
  category?: string;
  description?: string | null;
  status?: string;
  priority?: number;
  createdAt?: string;
}


export interface CreateReportRequest {
  entityType: string;
  entityId: string;
  category: string;
  description?: string | null;
}


export const REPORT_ENTITY_TYPE_POST = 'Post';
export const REPORT_ENTITY_TYPE_USER = 'User';

export const REPORT_CATEGORIES = [
  { value: 'spam', label: 'Spam' },
  { value: 'hate_speech', label: 'Discurso de odio' },
  { value: 'harassment', label: 'Acoso' },
  { value: 'misinformation', label: 'Información falsa' },
  { value: 'nudity', label: 'Contenido sexual' },
  { value: 'violence', label: 'Violencia' },
  { value: 'copyright', label: 'Derechos de autor' },
  { value: 'other', label: 'Otro' },
] as const;

export type ReportCategory = typeof REPORT_CATEGORIES[number]['value'];