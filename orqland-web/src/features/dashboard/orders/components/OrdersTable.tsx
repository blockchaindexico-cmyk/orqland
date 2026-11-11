'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { StatusDot } from '@/components/ui/status-dot';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { formatMinutes, formatMoney, minutesSince } from '@/features/dashboard/common/utils/format';
import { metaOf, ORDER_STATUS, PAYMENT_STATUS } from '@/features/dashboard/common/utils/status';
import { cn } from '@/lib/utils';
import type { OrderListItem } from '../types/order.types';

const FULFILMENT_LABEL = { SELF_DELIVERY: 'Own staff', AGENT_DELIVERY: 'Delivery agent', PICKUP: 'Customer pickup' } as const;
/** Same target as the engine's ORDER_SLA_ACCEPT_MINUTES default. */
export const ACCEPT_TARGET_MINUTES = 15;

export function OrdersTable({ orders, loading, selectedId, onSelect, now }: { orders: OrderListItem[]; loading: boolean; selectedId: string | null; onSelect: (id: string) => void; now: number }) {
  if (loading && !orders.length) return <Skeleton className="h-64 w-full" />;
  return (
    <Table className="min-w-[900px]">
      <THead>
        <tr>
          <TH>Order</TH>
          <TH>Status</TH>
          <TH>Customer</TH>
          <TH>Items</TH>
          <TH align="right">Total</TH>
          <TH>Payment</TH>
          <TH>Fulfilment</TH>
          <TH align="right">Age</TH>
        </tr>
      </THead>
      <TBody>
        {orders.map((o) => {
          const st = metaOf(ORDER_STATUS, o.orderStatus);
          const pay = metaOf(PAYMENT_STATUS, o.paymentStatus);
          const age = minutesSince(o.createdAt, now) ?? 0;
          const late = o.orderStatus === 'PLACED' && age > ACCEPT_TARGET_MINUTES;
          return (
            <TR
              key={o.id}
              interactive
              selected={selectedId === o.id}
              tabIndex={0}
              onClick={() => onSelect(o.id)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onSelect(o.id))}
              aria-label={`Order ${o.orderNumber}, ${st.label}`}
            >
              <TD mono className="font-semibold">
                {o.orderNumber}
              </TD>
              <TD>
                <StatusDot tone={st.tone} label={st.label} className="text-[12.5px]" />
              </TD>
              <TD>
                <p className="font-medium">{o.buyerSnapshot.name}</p>
                <p className="text-[11.5px] text-muted-foreground">{o.buyerSnapshot.phone ?? '—'}</p>
              </TD>
              <TD className="max-w-[220px]">
                <p className="truncate">{o.items.map((i) => `${i.quantity}× ${i.title}`).join(', ')}</p>
              </TD>
              <TD align="right" className="font-medium">
                {formatMoney(o.totalAmount)}
              </TD>
              <TD>
                <StatusDot tone={pay.tone} label={`${o.paymentMethod === 'COD' ? 'COD' : 'Online'} · ${pay.label}`} className="text-[12.5px]" />
              </TD>
              <TD className="text-[12.5px] text-muted-foreground">
                {o.fulfilmentMethod ? FULFILMENT_LABEL[o.fulfilmentMethod] : o.requestedFulfilment === 'PICKUP' ? 'Pickup requested' : 'Delivery requested'}
              </TD>
              <TD align="right" className={cn('text-[12.5px]', late ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
                {late && <span className="sr-only">Over the acceptance target: </span>}
                {formatMinutes(age)}
                {late && <span aria-hidden className="ml-1.5 inline-block size-1.5 rounded-full bg-destructive align-middle" />}
              </TD>
            </TR>
          );
        })}
      </TBody>
    </Table>
  );
}
