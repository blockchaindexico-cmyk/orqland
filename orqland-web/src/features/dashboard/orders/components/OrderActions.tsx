'use client';

import { ArrowRight, Bike, PackageCheck, RotateCcw, Store, Undo2, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ErrorNote } from '@/components/ui/panel';
import { ReasonDialog } from '@/features/dashboard/common/components/ReasonDialog';
import { gqlErrorMessage } from '@/features/dashboard/common/utils/gqlError';
import { DispatchDialog } from '@/features/dashboard/delivery/components/DispatchDialog';
import type { OrderActionName } from '../graphql/orders.graphql';
import { useOrderAction } from '../hooks/useOrders';
import type { OrderDetail } from '../types/order.types';
import { MarkReturnedDialog } from './MarkReturnedDialog';

/** Delivery Management page route — adjust if your dashboard routes differ. */
export const DELIVERY_PAGE_HREF = '/delivery';

type ReasonAction = { name: OrderActionName; title: string; confirm: string; destructive?: boolean };

const ACTIVE_DELIVERY = ['PENDING_ASSIGNMENT', 'OFFERED', 'ACCEPTED', 'ARRIVING_AT_PICKUP', 'PICKED_UP', 'IN_TRANSIT'];

/** The next step is the primary button; everything else is secondary. Driven by allowedNextStatuses from the API. */
export function OrderActions({ order, orqspaceId }: { order: OrderDetail; orqspaceId: string }) {
  const action = useOrderAction();
  const [reasonAction, setReasonAction] = useState<ReasonAction | null>(null);
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const can = (s: string) => order.allowedNextStatuses.includes(s as never);
  const run = (name: OrderActionName) => action.mutate({ name, input: { orderId: order.id } });
  const deliveryActive = order.delivery && ACTIVE_DELIVERY.includes(order.delivery.status);
  const pending = action.isPending;

  const buttons: React.ReactNode[] = [];
  switch (order.orderStatus) {
    case 'PLACED':
      buttons.push(
        <Button key="accept" disabled={pending} onClick={() => run('acceptOrder')}>
          Accept order <ArrowRight />
        </Button>,
        <Button key="reject" variant="outline" onClick={() => setReasonAction({ name: 'rejectOrder', title: 'Reject this order?', confirm: 'Reject order', destructive: true })}>
          Reject
        </Button>,
      );
      break;
    case 'ACCEPTED':
      buttons.push(
        <Button key="prep" disabled={pending} onClick={() => run('startPreparingOrder')}>
          Start preparing <ArrowRight />
        </Button>,
      );
      break;
    case 'PREPARING':
      buttons.push(
        <Button key="ready" disabled={pending} onClick={() => run('markOrderReady')}>
          <PackageCheck /> Mark ready
        </Button>,
      );
      break;
    case 'READY_FOR_FULFILMENT':
      if (deliveryActive) {
        buttons.push(
          <Button key="track" asChild variant="outline">
            <Link href={`${DELIVERY_PAGE_HREF}?task=${order.delivery!.id}`}>
              <Bike /> Track delivery {order.delivery!.taskNumber}
            </Link>
          </Button>,
        );
      } else {
        if (order.deliveryAddressSnapshot) {
          buttons.push(
            <Button key="dispatch" onClick={() => setDispatchOpen(true)}>
              <Bike /> Dispatch for delivery
            </Button>,
          );
        }
        buttons.push(
          <Button key="pickup" variant={order.deliveryAddressSnapshot ? 'outline' : 'default'} disabled={pending} onClick={() => run('markOrderAwaitingPickup')}>
            <Store /> Ready for customer pickup
          </Button>,
        );
      }
      break;
    case 'AWAITING_CUSTOMER_PICKUP':
      buttons.push(
        <Button key="collected" disabled={pending} onClick={() => run('confirmCustomerPickup')}>
          <PackageCheck /> Customer collected
        </Button>,
        <Button key="back" variant="outline" disabled={pending} onClick={() => run('reopenOrderForFulfilment')}>
          <Undo2 /> Change fulfilment
        </Button>,
      );
      break;
    case 'OUT_FOR_DELIVERY':
      if (order.delivery) {
        buttons.push(
          <Button key="track" asChild variant="outline">
            <Link href={`${DELIVERY_PAGE_HREF}?task=${order.delivery.id}`}>
              <Bike /> Track delivery
            </Link>
          </Button>,
        );
      }
      break;
    case 'DELIVERY_FAILED':
      buttons.push(
        <Button key="redispatch" disabled={pending} onClick={() => run('reopenOrderForFulfilment')}>
          <RotateCcw /> Try again
        </Button>,
        <Button key="returned" variant="outline" onClick={() => setReturnOpen(true)}>
          Mark returned
        </Button>,
      );
      break;
    case 'RETURN_REQUESTED':
      buttons.push(
        <Button key="returned" onClick={() => setReturnOpen(true)}>
          Accept return
        </Button>,
        <Button key="decline" variant="outline" onClick={() => setReasonAction({ name: 'declineOrderReturn', title: 'Decline the return request?', confirm: 'Decline return' })}>
          Decline
        </Button>,
      );
      break;
  }
  if (can('CANCELLED')) {
    buttons.push(
      <Button key="cancel" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setReasonAction({ name: 'cancelOrderByWorkspace', title: 'Cancel this order?', confirm: 'Cancel order', destructive: true })}>
        <X /> Cancel order
      </Button>,
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">{buttons}</div>
      {action.error && !reasonAction && <ErrorNote message={gqlErrorMessage(action.error)} />}
      {reasonAction && (
        <ReasonDialog
          open
          onOpenChange={(o) => !o && setReasonAction(null)}
          title={reasonAction.title}
          description="The customer sees this status change. The reason is stored in the order timeline."
          confirmLabel={reasonAction.confirm}
          destructive={reasonAction.destructive}
          pending={pending}
          error={action.error ? gqlErrorMessage(action.error) : null}
          onConfirm={(reason) => action.mutate({ name: reasonAction.name, input: { orderId: order.id, reason } }, { onSuccess: () => setReasonAction(null) })}
        />
      )}
      {dispatchOpen && (
        <DispatchDialog open onOpenChange={setDispatchOpen} orqspaceId={orqspaceId} target={{ kind: 'dispatch', orderId: order.id, orderNumber: order.orderNumber }} />
      )}
      {returnOpen && <MarkReturnedDialog open onOpenChange={setReturnOpen} orderId={order.id} />}
    </div>
  );
}
