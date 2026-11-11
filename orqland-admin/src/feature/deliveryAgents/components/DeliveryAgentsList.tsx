import { useNavigate } from '@tanstack/react-router';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useDeliveryAgents } from '../hooks/useDeliveryAgents';
import { AGENT_QUEUES } from '../types/delivery-agents.types';
import { DataTable } from '@/components/ui/data-table';
import { deliveryAgentColumns } from './DeliveryAgentColumns';

/** Delivery agents: KYC manual-review queue and directory. Never shows raw licence/vehicle numbers. */
export function DeliveryAgentsList() {
  const navigate = useNavigate();
  const [queue, setQueue] = useState('review');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const statuses = AGENT_QUEUES.find((q) => q.key === queue)?.statuses;
  const { data, isLoading } = useDeliveryAgents(statuses, search.trim(), page);
  const lastPage = Math.max(1, Math.ceil((data?.total ?? 0) / 25));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Delivery agents</h1>
          <p className="text-sm text-muted-foreground">Review KYC mismatches, and suspend or reinstate agents platform-wide.</p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Orq ID or name" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto border-b border-border">
        {AGENT_QUEUES.map((q) => (
          <button
            key={q.key}
            onClick={() => { setQueue(q.key); setPage(1); }}
            className={cn('-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium', queue === q.key ? 'border-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}
          >
            {q.label}
          </button>
        ))}
      </nav>
      <DataTable
        data={data?.items ?? []}
        columns={deliveryAgentColumns}
        empty={isLoading ? 'Loading…' : 'No agents in this view.'}
        onRowClick={(a) => void navigate({ to: '/delivery-agents/$userId', params: { userId: a.profile.userId } })}
      />
      {(data?.total ?? 0) > 25 && (
        <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
          Page {page} of {lastPage}
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <Button size="sm" variant="outline" disabled={page >= lastPage} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}
