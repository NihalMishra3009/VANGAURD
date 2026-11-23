export type UserRole = 'ADMIN' | 'CAMPAIGN_MANAGER' | 'HUMAN_COLLECTOR' | 'SUPERVISOR';

export type EligibilityStatus = 'ELIGIBLE' | 'INELIGIBLE' | 'DO_NOT_CALL' | 'REQUIRES_REVIEW';

export type CampaignStatus = 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';

export type CallStatus = 'PENDING' | 'QUEUED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'ESCALATED' | 'SAFE_TERMINATED';

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface AuditLog {
  id: number;
  user_id: number | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: Record<string, any> | null;
  ip_address: string | null;
  created_at: string;
}

export interface Borrower {
  id: number;
  borrower_id: string;
  name: string;
  phone: string;
  masked_phone: string;
  preferred_language: string;
  emi_amount: number;
  outstanding_amount: number;
  due_date: string;
  eligibility_status: EligibilityStatus;
  risk_score: number | null;
  account_number: string | null;
  stop_contact: boolean;
  dispute_status: string;
  upload_batch_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface BorrowerDetail extends Borrower {
  campaign_history: Array<{
    campaign_id: number;
    campaign_name: string;
    calling_status: string;
    retry_count: number;
    priority: number;
    assigned_at: string | null;
    last_attempt_at: string | null;
  }>;
  call_attempts_count: number;
  recent_calls: Array<{
    session_uuid: string;
    status: string;
    language: string;
    start_time: string | null;
    duration_seconds: number;
    final_outcome: string | null;
    is_escalated: boolean;
    escalation_reason: string | null;
  }>;
  commitments_history: Array<{
    id: number;
    promised_amount: number;
    promised_date: string;
    payment_method: string | null;
    explicitly_confirmed: boolean;
    created_at: string | null;
  }>;
}

export interface RowValidationError {
  row_index: number;
  raw_data: Record<string, any>;
  errors: string[];
  warnings: string[];
}

export interface UploadPreviewResponse {
  batch_id: string;
  filename: string;
  detected_columns: string[];
  mapped_columns: Record<string, string>;
  total_rows: number;
  valid_count: number;
  invalid_count: number;
  duplicate_count: number;
  valid_rows: any[];
  invalid_rows: RowValidationError[];
}

export interface UploadBatch {
  id: number;
  batch_id: string;
  filename: string;
  file_size_bytes: number;
  uploaded_by_id: number | null;
  total_rows: number;
  valid_rows: number;
  imported_rows: number;
  rejected_rows: number;
  duplicate_rows: number;
  status: string;
  summary: Record<string, any> | null;
  created_at: string;
}

export interface CampaignStats {
  total_assigned: number;
  queued: number;
  in_progress: number;
  completed: number;
  failed: number;
  escalated: number;
  safe_terminated: number;
  total_outstanding_amount: number;
}

export interface Campaign {
  id: number;
  name: string;
  description: string | null;
  target_language: string;
  status: CampaignStatus;
  start_date: string | null;
  end_date: string | null;
  retry_limit: number;
  cooling_off_hours: number;
  priority_weight: number;
  created_by_id: number | null;
  created_at: string;
  updated_at: string;
  stats?: CampaignStats;
}

export interface CampaignBorrower {
  id: number;
  campaign_id: number;
  borrower_id: number;
  priority: number;
  calling_status: string;
  retry_count: number;
  is_active_call: boolean;
  last_attempt_at: string | null;
  notes: string | null;
  borrower: Borrower;
}
