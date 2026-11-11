import type { ColumnDef } from '@tanstack/react-table';
import type { PlatformAgent } from '../types/delivery-agents.types';
import { StatusPill } from '@/components/ui/status-pill';
import { formatDate, humanize } from '@/utils/format';
import { AGENT_STATUS_TONE, CHECK_TONE } from '../types/status-tones';

export const deliveryAgentColumns: ColumnDef<PlatformAgent>[] = [
  {
    id: 'agent',
    header: 'Agent',
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.profile.displayName}</p>
        <p className="font-mono text-xs text-muted-foreground">{row.original.profile.orqUserId}</p>
      </div>
    ),
  },
  { id: 'status', header: 'Status', cell: ({ row }) => <StatusPill status={row.original.profile.agentStatus} tones={AGENT_STATUS_TONE} /> },
  {
    id: 'licence',
    header: 'Licence',
    cell: ({ row }) => (
      <div className="space-y-1">
        <StatusPill status={row.original.profile.licenceStatus} tones={CHECK_TONE} />
        <p className="font-mono text-xs text-muted-foreground">••{row.original.profile.licenceNumberLast4}</p>
      </div>
    ),
  },
  {
    id: 'vehicle',
    header: 'Vehicle',
    cell: ({ row }) => (
      <div className="space-y-1">
        <StatusPill status={row.original.profile.vehicleStatus} tones={CHECK_TONE} />
        <p className="text-xs text-muted-foreground">
          {humanize(row.original.profile.vehicleCategory)} · {row.original.profile.vehicleNumberMasked}
        </p>
      </div>
    ),
  },
  {
    id: 'due',
    header: 'Next re-KYC',
    cell: ({ row }) => {
      const { licenceNextDueAt, vehicleNextDueAt } = row.original.profile;
      const next = [licenceNextDueAt, vehicleNextDueAt].filter(Boolean).sort()[0] ?? null;
      return <span className="text-sm">{formatDate(next)}</span>;
    },
  },
  { id: 'connections', header: 'Workspaces', cell: ({ row }) => <span className="tabular-nums">{row.original.activeConnections}</span> },
  { id: 'deliveries', header: 'Delivered', cell: ({ row }) => <span className="tabular-nums">{row.original.completedDeliveries}</span> },
  {
    id: 'reason',
    header: 'Note',
    cell: ({ row }) => <span className="line-clamp-2 max-w-[220px] text-xs text-muted-foreground">{row.original.profile.suspendedReason ?? row.original.profile.lastFailureReason ?? ''}</span>,
  },
];
