import type { ColumnDef } from '@tanstack/react-table';
import { StatusPill, type Tone } from '@/components/ui/status-pill';
import { formatDateTime, humanize } from '@/utils/format';
import type { SupportTicket } from '../types/support.types';

export const TICKET_STATUS_TONE: Record<string, Tone> = { OPEN: 'info', IN_PROGRESS: 'neutral', WAITING_ON_AGENT: 'warning', RESOLVED: 'success', CLOSED: 'muted' };
export const PRIORITY_TONE: Record<string, Tone> = { LOW: 'muted', NORMAL: 'neutral', HIGH: 'warning', URGENT: 'danger' };

export const supportTicketColumns: ColumnDef<SupportTicket>[] = [
  {
    id: 'ticket',
    header: 'Ticket',
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.subject}</p>
        <p className="font-mono text-xs text-muted-foreground">{row.original.ticketNumber}</p>
      </div>
    ),
  },
  { id: 'category', header: 'Category', cell: ({ row }) => humanize(row.original.category) },
  { id: 'priority', header: 'Priority', cell: ({ row }) => <StatusPill status={row.original.priority} tones={PRIORITY_TONE} /> },
  { id: 'status', header: 'Status', cell: ({ row }) => <StatusPill status={row.original.status} tones={TICKET_STATUS_TONE} /> },
  {
    id: 'agent',
    header: 'Raised by',
    cell: ({ row }) => (
      <div>
        <p>{row.original.raisedByName}</p>
        <p className="font-mono text-xs text-muted-foreground">{row.original.raisedByOrqUserId}</p>
      </div>
    ),
  },
  { id: 'team', header: 'Team', cell: ({ row }) => humanize(row.original.assignedTeam) },
  { id: 'updated', header: 'Updated', cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatDateTime(row.original.updatedAt)}</span> },
];
