export interface SupportTicket {
  id: string;
  ticketNumber: string;
  raisedByUserId: string;
  raisedByName: string;
  raisedByOrqUserId: string;
  category: string;
  subject: string;
  description: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  status: 'OPEN' | 'IN_PROGRESS' | 'WAITING_ON_AGENT' | 'RESOLVED' | 'CLOSED';
  assignedTeam: string | null;
  relatedTaskNumber: string | null;
  relatedEarningId: string | null;
  relatedPeriodMonth: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  messages?: { id: string; authorRole: string; authorName: string | null; body: string; attachmentUrls: string[]; isInternal: boolean; createdAt: string }[];
}

export const TICKET_STATUSES = ['OPEN', 'IN_PROGRESS', 'WAITING_ON_AGENT', 'RESOLVED', 'CLOSED'] as const;
export const TICKET_PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const;
export const TICKET_CATEGORIES = ['DELIVERY', 'EARNINGS_PAYMENT', 'KYC', 'WORKSPACE', 'TECHNICAL', 'ACCOUNT_SECURITY', 'EMERGENCY'] as const;
export const SUPPORT_TEAMS = ['OPERATIONS', 'FINANCE', 'VERIFICATION', 'TECH', 'TRUST_SAFETY', 'SAFETY'] as const;
