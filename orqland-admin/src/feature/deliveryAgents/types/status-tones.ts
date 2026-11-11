import type { Tone } from '@/components/ui/status-pill';

export const AGENT_STATUS_TONE: Record<string, Tone> = {
  ACTIVE: 'success',
  MANUAL_REVIEW: 'warning',
  PENDING_VERIFICATION: 'info',
  KYC_BLOCKED: 'danger',
  SUSPENDED: 'danger',
  REJECTED: 'muted',
  DEACTIVATED: 'muted',
};
export const CHECK_TONE: Record<string, Tone> = { VERIFIED: 'success', PASSED: 'success', PENDING: 'info', MISMATCH: 'warning', PROVIDER_UNAVAILABLE: 'warning', FAILED: 'danger', EXPIRED: 'danger', NOT_STARTED: 'muted' };
