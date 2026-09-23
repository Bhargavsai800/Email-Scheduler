import { HealthResponse, ScheduledEmail, ScheduleEmailPayload, RateLimitTelemetry } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export async function fetchHealth(): Promise<HealthResponse> {
  const url = API_BASE_URL.endsWith('/api') ? `${API_BASE_URL}/health` : `${API_BASE_URL}/api/health`;
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
  }

  return response.json();
}

export async function scheduleEmail(payload: ScheduleEmailPayload): Promise<ScheduledEmail> {
  const url = API_BASE_URL.endsWith('/api') ? `${API_BASE_URL}/emails/schedule` : `${API_BASE_URL}/api/emails/schedule`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  const json = await response.json();
  if (!response.ok) {
    const errorMsg = json.error?.message || json.error || 'Failed to schedule email';
    const details = json.error?.details ? Object.values(json.error.details).flat().join(', ') : '';
    throw new Error(details ? `${errorMsg}: ${details}` : errorMsg);
  }

  return json.data;
}

export async function fetchScheduledEmails(): Promise<ScheduledEmail[]> {
  const url = API_BASE_URL.endsWith('/api') ? `${API_BASE_URL}/emails/scheduled` : `${API_BASE_URL}/api/emails/scheduled`;
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: Failed to load scheduled emails`);
  }

  const json = await response.json();
  return json.data || [];
}

export async function fetchSentEmails(): Promise<ScheduledEmail[]> {
  const url = API_BASE_URL.endsWith('/api') ? `${API_BASE_URL}/emails/sent` : `${API_BASE_URL}/api/emails/sent`;
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: Failed to load sent emails`);
  }

  const json = await response.json();
  return json.data || [];
}

export async function fetchEmailById(id: string): Promise<ScheduledEmail> {
  const url = API_BASE_URL.endsWith('/api') ? `${API_BASE_URL}/emails/${id}` : `${API_BASE_URL}/api/emails/${id}`;
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: Email not found or access denied`);
  }

  const json = await response.json();
  return json.data;
}

export async function fetchRateLimitStatus(): Promise<RateLimitTelemetry> {
  const url = API_BASE_URL.endsWith('/api') ? `${API_BASE_URL}/emails/rate-limit` : `${API_BASE_URL}/api/emails/rate-limit`;
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: Failed to load rate limit status`);
  }

  const json = await response.json();
  return json.data;
}

export interface SearchParams {
  query?: string;
  status?: string;
  recipient?: string;
  page?: number;
  limit?: number;
}

export interface SearchResponse {
  success: boolean;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  source: 'elasticsearch' | 'database_fallback';
  data: ScheduledEmail[];
}

export async function searchEmails(params: SearchParams): Promise<SearchResponse> {
  const queryParams = new URLSearchParams();
  if (params.query) queryParams.set('q', params.query);
  if (params.status && params.status !== 'ALL') queryParams.set('status', params.status);
  if (params.recipient) queryParams.set('recipient', params.recipient);
  if (params.page) queryParams.set('page', String(params.page));
  if (params.limit) queryParams.set('limit', String(params.limit));

  const url = API_BASE_URL.endsWith('/api')
    ? `${API_BASE_URL}/emails/search?${queryParams.toString()}`
    : `${API_BASE_URL}/api/emails/search?${queryParams.toString()}`;

  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: Failed to search emails`);
  }

  return response.json();
}

export interface BatchSchedulePayload {
  recipients: string[];
  subject: string;
  body: string;
  startTime: string;
  delayBetweenEmailsMs?: number;
  hourlyLimit?: number;
}

export interface BatchScheduleResponse {
  totalSubmitted: number;
  validRecipients: number;
  uniqueRecipients: number;
  scheduledCount: number;
  firstScheduledAt?: string;
  lastScheduledAt?: string;
  invalidRecipients?: string[];
  emails: ScheduledEmail[];
}

export async function batchScheduleEmails(
  payload: BatchSchedulePayload
): Promise<BatchScheduleResponse> {
  const url = API_BASE_URL.endsWith('/api')
    ? `${API_BASE_URL}/emails/batch-schedule`
    : `${API_BASE_URL}/api/emails/batch-schedule`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    const message =
      errorJson?.error?.message ||
      `HTTP ${response.status}: Failed to schedule batch emails`;
    throw new Error(message);
  }

  const json = await response.json();
  return json.data;
}

