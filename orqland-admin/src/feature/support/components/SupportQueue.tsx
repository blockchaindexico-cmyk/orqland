import { useNavigate } from '@tanstack/react-router';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/ui/data-table';
import { humanize } from '@/utils/format';
import { cn } from '@/lib/utils';
import { useSupportTickets } from '../hooks/useSupport';
import { TICKET_CATEGORIES } from '../types/support.types';
import { supportTicketColumns } from './SupportTicketColumns';

const VIEWS: { key: string; label: string; statuses?: string[] }[] = [
  { key: 'open', label: 'Needs support', statuses: ['OPEN', 'IN_PROGRESS'] },
  { key: 'waiting', label: 'Waiting on agent', statuses: ['WAITING_ON_AGENT'] },
  { key: 'done', label: 'Resolved / closed', statuses: ['RESOLVED', 'CLOSED'] },
  { key: 'all', label: 'All' },
];

/** Delivery-agent support queue (delivery issues, earnings disputes, KYC, safety incidents). */
export function SupportQueue() {
  const navigate = useNavigate();
  const [view, setView] = useState('open');
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const { data, isLoading } = useSupportTickets(VIEWS.find((v) => v.key === view)?.statuses, category, search.trim(), 1);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Support</h1>
          <p className="text-sm text-muted-foreground">Tickets raised from Orqland Run. Emergencies are marked urgent automatically.</p>
        </div>
        <div className="flex gap-2">
          <select className="h-9 rounded-md border border-input bg-card px-2 text-sm" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
            <option value="">All categories</option>
            {TICKET_CATEGORIES.map((c) => (
              <option key={c} value={c}>{humanize(c)}</option>
            ))}
          </select>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Ticket no., subject or Orq ID" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
      </div>
      <nav className="flex gap-1 border-b border-border">
        {VIEWS.map((v) => (
          <button key={v.key} onClick={() => setView(v.key)} className={cn('-mb-px border-b-2 px-3 py-2 text-sm font-medium', view === v.key ? 'border-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}>
            {v.label}
          </button>
        ))}
      </nav>
      <DataTable
        data={data?.items ?? []}
        columns={supportTicketColumns}
        empty={isLoading ? 'Loading…' : 'No tickets in this view.'}
        onRowClick={(t) => void navigate({ to: '/support/$ticketId', params: { ticketId: t.id } })}
      />
    </div>
  );
}
