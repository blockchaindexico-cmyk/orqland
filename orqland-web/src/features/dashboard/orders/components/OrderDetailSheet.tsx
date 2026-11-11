'use client';

import { Phone } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { SectionLabel } from '@/components/ui/panel';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusDot } from '@/components/ui/status-dot';
import { Timeline } from '@/components/ui/timeline';
import { formatAddress, formatDateTime, formatMoney } from '@/features/dashboard/common/utils/format';
import { metaOf, ORDER_STATUS, PAYMENT_STATUS, TASK_STATUS } from '@/features/dashboard/common/utils/status';
import { useOrderDetail } from '../hooks/useOrders';
import { DELIVERY_PAGE_HREF, OrderActions } from './OrderActions';
import { RecordPaymentDialog } from './RecordPaymentDialog';

const FULFILMENT_LABEL = { SELF_DELIVERY: 'Own staff', AGENT_DELIVERY: 'Delivery agent', PICKUP: 'Customer pickup' } as const;

/** Order detail: who, what, money, delivery record and a timestamped status timeline. */
export function OrderDetailSheet({ orderId, orqspaceId, onClose }: { orderId: string | null; orqspaceId: string; onClose: () => void }) {
  const { data: order, isLoading } = useOrderDetail(orderId);
  const [paymentOpen, setPaymentOpen] = useState(false);

  return (
    <Sheet open={!!orderId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="ops-theme">
        {isLoading || !order ? (
          <div className="space-y-4 p-6">
            <SheetTitle className="sr-only">Loading order</SheetTitle>
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : (
          <>
            <header className="space-y-3 border-b border-border px-6 pb-4 pt-6">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pr-8">
                <SheetTitle className="font-mono text-[17px] tracking-tight">{order.orderNumber}</SheetTitle>
                <StatusDot tone={metaOf(ORDER_STATUS, order.orderStatus).tone} label={metaOf(ORDER_STATUS, order.orderStatus).label} className="text-[13px]" />
                <StatusDot
                  tone={metaOf(PAYMENT_STATUS, order.paymentStatus).tone}
                  label={`${order.paymentMethod === 'COD' ? 'COD' : 'Online'} · ${metaOf(PAYMENT_STATUS, order.paymentStatus).label}`}
                  className="text-[13px]"
                />
              </div>
              <SheetDescription>
                Placed {formatDateTime(order.createdAt)} · {order.requestedFulfilment === 'PICKUP' ? 'customer pickup requested' : 'delivery requested'}
                {order.fulfilmentMethod && ` · ${FULFILMENT_LABEL[order.fulfilmentMethod]}`}
              </SheetDescription>
              <OrderActions order={order} orqspaceId={orqspaceId} />
            </header>

            <div className="flex-1 overflow-y-auto">
              {(order.rejectionReason || order.cancellationReason) && (
                <p className="border-b border-border px-6 py-3 text-[13px]">
                  <span className="font-medium">{order.rejectionReason ? 'Rejected — ' : 'Cancelled — '}</span>
                  {order.rejectionReason ?? order.cancellationReason}
                </p>
              )}

              <div className="grid gap-px bg-border sm:grid-cols-2">
                <div className="bg-card px-6 py-4">
                  <SectionLabel>Buyer</SectionLabel>
                  <p className="mt-1 text-[13px] font-medium">{order.buyerSnapshot.name}</p>
                  <p className="font-mono text-[11.5px] text-muted-foreground">{order.buyerSnapshot.orqUserId}</p>
                  {order.buyerSnapshot.phone && (
                    <a href={`tel:${order.buyerSnapshot.phone}`} className="mt-1 inline-flex items-center gap-1 text-[12.5px] underline-offset-2 hover:underline">
                      <Phone className="size-3.5" /> {order.buyerSnapshot.phone}
                    </a>
                  )}
                </div>
                <div className="bg-card px-6 py-4">
                  <SectionLabel>{order.deliveryAddressSnapshot ? 'Deliver to' : 'Fulfilment'}</SectionLabel>
                  {order.deliveryAddressSnapshot ? (
                    <div className="mt-1 text-[13px]">
                      <p className="font-medium">{order.deliveryAddressSnapshot.recipientName}</p>
                      <p className="text-muted-foreground">{formatAddress(order.deliveryAddressSnapshot)}</p>
                      {order.deliveryAddressSnapshot.recipientPhone && <p className="text-[12px] text-muted-foreground">{order.deliveryAddressSnapshot.recipientPhone}</p>}
                    </div>
                  ) : (
                    <p className="mt-1 text-[13px] text-muted-foreground">The customer collects from the workspace.</p>
                  )}
                </div>
              </div>

              {order.customerNote && (
                <p className="border-y border-border bg-muted/50 px-6 py-2.5 text-[13px]">
                  <span className="font-medium">Customer note — </span>
                  {order.customerNote}
                </p>
              )}

              <section className="px-6 py-4">
                <SectionLabel className="mb-2">Items · {order.itemCount}</SectionLabel>
                <ul className="divide-y divide-border border-y border-border">
                  {order.items.map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-4 py-2 text-[13px]">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{item.title}</p>
                        <p className="text-[11.5px] text-muted-foreground">
                          {[item.variantLabel, item.sku].filter(Boolean).join(' · ') || 'Standard'} · {formatMoney(item.unitTotalPrice)} × {item.quantity}
                        </p>
                      </div>
                      <span className="tabular">{formatMoney(item.lineTotal)}</span>
                    </li>
                  ))}
                </ul>
                <dl className="tabular ml-auto mt-2 max-w-[240px] space-y-0.5 text-[13px]">
                  <Row label="Subtotal" value={formatMoney(order.subtotalBase)} />
                  <Row label="GST" value={formatMoney(order.totalGst)} />
                  {Number(order.deliveryFee) > 0 && <Row label="Delivery" value={formatMoney(order.deliveryFee)} />}
                  {Number(order.discountTotal) > 0 && <Row label="Discount" value={`− ${formatMoney(order.discountTotal)}`} />}
                  <div className="border-t border-border pt-1 font-semibold">
                    <Row label="Total" value={formatMoney(order.totalAmount)} />
                  </div>
                </dl>
              </section>

              {order.delivery && (
                <section className="border-t border-border px-6 py-4">
                  <div className="mb-2 flex items-center justify-between">
                    <SectionLabel>Delivery record</SectionLabel>
                    <Link href={`${DELIVERY_PAGE_HREF}?tab=live&task=${order.delivery.id}`} className="text-[12px] underline underline-offset-2">
                      Open on live map
                    </Link>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-[13px]">
                    <span>
                      <span className="font-medium">
                        {order.delivery.mode === 'SELF' ? (order.delivery.selfStaffName ?? 'Own staff') : (order.delivery.agent?.displayName ?? 'Awaiting agent')}
                      </span>
                      <span className="block font-mono text-[11.5px] text-muted-foreground">{order.delivery.taskNumber}</span>
                    </span>
                    <StatusDot tone={metaOf(TASK_STATUS, order.delivery.status).tone} label={metaOf(TASK_STATUS, order.delivery.status).label} />
                  </div>
                  {order.delivery.needsAttention && <p className="mt-1 text-[12px]">{order.delivery.attentionReason}</p>}
                </section>
              )}

              <section className="border-t border-border px-6 py-4">
                <div className="mb-2 flex items-center justify-between">
                  <SectionLabel>Payments</SectionLabel>
                  <Button size="sm" variant="ghost" onClick={() => setPaymentOpen(true)}>
                    Record payment
                  </Button>
                </div>
                {order.payments.length === 0 ? (
                  <p className="text-[12.5px] text-muted-foreground">
                    {order.paymentMethod === 'COD' ? 'Cash on delivery — marked paid once the agent’s cash handover is settled in Delivery → COD.' : 'No payment recorded yet.'}
                  </p>
                ) : (
                  <ul className="divide-y divide-border text-[13px]">
                    {order.payments.map((p) => (
                      <li key={p.id} className="flex items-center justify-between py-1.5">
                        <span>
                          {p.kind === 'REFUND' ? 'Refund' : 'Payment'} · {p.provider === 'COD' ? 'COD settled' : p.method === 'COD' ? 'Cash' : 'Online'}
                          {p.providerReference && p.provider !== 'COD' && <span className="ml-1 font-mono text-[11.5px] text-muted-foreground">{p.providerReference}</span>}
                        </span>
                        <span className="tabular">{p.status === 'FAILED' ? <StatusDot tone="critical" label="Failed" /> : formatMoney(p.amount)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="border-t border-border px-6 py-4">
                <SectionLabel className="mb-3">Timeline</SectionLabel>
                <Timeline
                  items={order.history.map((h, i, all) => ({
                    id: h.id,
                    title: metaOf(ORDER_STATUS, h.toStatus).label,
                    meta: [h.actorName ?? h.actorRole.toLowerCase(), h.actorRole === 'PLATFORM_ADMIN' ? 'platform override' : null, h.reason].filter(Boolean).join(' · '),
                    time: formatDateTime(h.createdAt),
                    state: ['REJECTED', 'CANCELLED', 'DELIVERY_FAILED'].includes(h.toStatus) ? 'problem' : i === all.length - 1 ? 'current' : 'done',
                  }))}
                />
              </section>
            </div>
            {paymentOpen && <RecordPaymentDialog order={order} open onOpenChange={setPaymentOpen} />}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
