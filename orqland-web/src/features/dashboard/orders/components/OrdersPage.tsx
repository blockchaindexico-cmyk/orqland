'use client';

import '@/styles/ops-theme.css';
import { ChevronLeft, ChevronRight, RefreshCw, Search } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Metric, MetricStrip } from '@/components/ui/metric';
import { EmptyState, ErrorNote, Panel } from '@/components/ui/panel';
import { UnderlineTabs } from '@/components/ui/underline-tabs';
import { useActiveOrqspaceId } from '@/features/dashboard/common/hooks/useActiveOrqspaceId';
import { useNow } from '@/features/dashboard/common/hooks/useNow';
import { gqlErrorMessage } from '@/features/dashboard/common/utils/gqlError';
import { useOrderCounts, useOrqspaceOrders } from '../hooks/useOrders';
import { ORDER_QUEUES, type OrderStatus, type PaymentMethod } from '../types/order.types';
import { OrderDetailSheet } from './OrderDetailSheet';
import { OrdersTable } from './OrdersTable';

const PAGE_SIZE = 20;
const sumOf = (counts: Partial<Record<OrderStatus, number>> | undefined, statuses: OrderStatus[] | null) =>
  statuses ? statuses.reduce((n, s) => n + (counts?.[s] ?? 0), 0) : Object.values(counts ?? {}).reduce((a, b) => a + (b ?? 0), 0);

/** Order queue (guide §6 A): received → accept/reject → preparation → ready for fulfilment. */
export function OrdersPage() {
  const orqspaceId = useActiveOrqspaceId();
  const params = useSearchParams();
  const initialQueue = ORDER_QUEUES.find((q) => q.statuses?.includes((params.get('status') ?? '') as OrderStatus))?.key ?? 'new';
  const [queue, setQueue] = useState(initialQueue);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(params.get('order'));
  const now = useNow(30_000);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => setPage(1), [queue, debounced, paymentMethod]);

  const statuses = ORDER_QUEUES.find((q) => q.key === queue)?.statuses ?? undefined;
  const filter = useMemo(
    () => (orqspaceId ? { orqspaceId, statuses: statuses ?? undefined, search: debounced || undefined, paymentMethod: paymentMethod || undefined, page, pageSize: PAGE_SIZE } : null),
    [orqspaceId, statuses, debounced, paymentMethod, page],
  );
  const orders = useOrqspaceOrders(filter);
  const counts = useOrderCounts(orqspaceId);

  if (!orqspaceId) return <EmptyState title="Open a workspace" body="Orders are managed per workspace." />;

  const count = (key: string) => sumOf(counts.data, ORDER_QUEUES.find((q) => q.key === key)?.statuses ?? null);
  const total = orders.data?.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="ops-theme -m-4 min-h-[calc(100vh-68px)] bg-background p-4 md:-m-6 md:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">Orders</h1>
          <p className="mt-0.5 text-[12.5px] text-muted-foreground">Accept, prepare and hand over customer orders. Deliveries are run from Delivery operations.</p>
        </div>
        <Button variant="outline" size="sm" aria-label="Refresh" onClick={() => void Promise.all([orders.refetch(), counts.refetch()])}>
          <RefreshCw className={orders.isFetching ? 'animate-spin' : undefined} />
        </Button>
      </header>

      <MetricStrip className="mt-4">
        <Metric label="New" value={count('new')} hint="waiting to be accepted" state={count('new') ? 'warn' : undefined} onClick={() => setQueue('new')} selected={queue === 'new'} />
        <Metric label="In preparation" value={count('preparing')} onClick={() => setQueue('preparing')} selected={queue === 'preparing'} />
        <Metric label="Ready" value={count('ready')} hint="dispatch or hand over" onClick={() => setQueue('ready')} selected={queue === 'ready'} />
        <Metric label="Out for delivery" value={count('out')} onClick={() => setQueue('out')} selected={queue === 'out'} />
        <Metric label="Needs action" value={count('attention')} hint="failed delivery · returns" state={count('attention') ? 'bad' : undefined} onClick={() => setQueue('attention')} selected={queue === 'attention'} />
        <Metric label="Completed" value={count('completed')} onClick={() => setQueue('completed')} selected={queue === 'completed'} />
      </MetricStrip>

      <Panel className="mt-5">
        <div className="flex flex-wrap items-end justify-between gap-3 px-4">
          <UnderlineTabs label="Order queues" className="border-b-0" value={queue} onChange={setQueue} items={ORDER_QUEUES.map((q) => ({ key: q.key, label: q.label, count: count(q.key) }))} />
          <div className="flex w-full gap-2 py-2 lg:w-auto">
            <Select className="w-40" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod | '')} aria-label="Payment method">
              <option value="">All payments</option>
              <option value="COD">Cash on delivery</option>
              <option value="ONLINE">Online</option>
            </Select>
            <div className="relative flex-1 lg:w-64">
              <Search aria-hidden className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input aria-label="Search orders" className="pl-8" placeholder="Order no., customer or phone" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="border-t border-border">
          {orders.error && <ErrorNote className="m-4" message={gqlErrorMessage(orders.error)} onRetry={() => void orders.refetch()} />}
          {!orders.isLoading && total === 0 ? (
            <EmptyState title="No orders in this queue" body={debounced ? 'Try a different search.' : 'Orders placed on your listings appear here.'} />
          ) : (
            <OrdersTable orders={orders.data?.items ?? []} loading={orders.isLoading} selectedId={selected} onSelect={setSelected} now={now} />
          )}
        </div>
        {total > PAGE_SIZE && (
          <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-2 text-[12.5px] text-muted-foreground">
            <span className="tabular">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
            </span>
            <Button size="icon" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Previous page">
              <ChevronLeft />
            </Button>
            <Button size="icon" variant="outline" disabled={page >= lastPage} onClick={() => setPage((p) => p + 1)} aria-label="Next page">
              <ChevronRight />
            </Button>
          </div>
        )}
      </Panel>

      <OrderDetailSheet orderId={selected} orqspaceId={orqspaceId} onClose={() => setSelected(null)} />
    </div>
  );
}
