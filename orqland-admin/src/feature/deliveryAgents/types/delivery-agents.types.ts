export type AgentStatus = 'PENDING_VERIFICATION' | 'MANUAL_REVIEW' | 'REJECTED' | 'ACTIVE' | 'KYC_BLOCKED' | 'SUSPENDED' | 'DEACTIVATED';

export interface VerificationAttempt {
  id: string;
  checkType: 'DRIVING_LICENCE' | 'VEHICLE_RC';
  trigger: string;
  status: string;
  mismatchFields: string[];
  requestedAt: string;
  completedAt: string | null;
}

export interface PlatformAgent {
  phone: string | null;
  email: string | null;
  activeConnections: number;
  completedDeliveries: number;
  createdAt: string;
  profile: {
    userId: string;
    orqUserId: string;
    displayName: string;
    agentStatus: AgentStatus;
    availability: string;
    licenceNumberLast4: string;
    licenceFrontFileId: string | null;
    licenceBackFileId: string | null;
    vehicleRcFileId: string | null;
    licenceStatus: string;
    licenceValidTo: string | null;
    licenceNextDueAt: string | null;
    vehicleNumberMasked: string;
    vehicleCategory: string;
    vehicleStatus: string;
    vehicleRcValidTo: string | null;
    vehicleNextDueAt: string | null;
    lastFailureReason: string | null;
    suspendedReason: string | null;
    activatedAt: string | null;
    eligibleForAssignments: boolean;
    kycAlerts: string[];
    verifications: VerificationAttempt[];
  };
}

export const AGENT_QUEUES: { key: string; label: string; statuses: AgentStatus[] | undefined }[] = [
  { key: 'review', label: 'Review queue', statuses: ['MANUAL_REVIEW'] },
  { key: 'pending', label: 'Pending verification', statuses: ['PENDING_VERIFICATION'] },
  { key: 'active', label: 'Active', statuses: ['ACTIVE'] },
  { key: 'blocked', label: 'KYC blocked', statuses: ['KYC_BLOCKED'] },
  { key: 'suspended', label: 'Suspended', statuses: ['SUSPENDED'] },
  { key: 'rejected', label: 'Rejected', statuses: ['REJECTED'] },
  { key: 'all', label: 'All', statuses: undefined },
];
