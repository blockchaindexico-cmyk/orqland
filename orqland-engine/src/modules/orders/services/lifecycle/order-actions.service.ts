import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import type { AuthUser } from '@/core/decorators/current-user.decorator';
import { DRIZZLE, type DrizzleDB } from '@/infrastructure/database/drizzle.module';
import { orderStatusHistory, type OrderStatus } from '@/infrastructure/database/schema';
import type {
  MarkOrderReturnedInput,
  OrderActionInput,
  OrderReasonInput,
  RecordOrderPaymentInput,
} from '../../dto/inputs/order-action.inputs';
import { OrdersQueryService } from '../orders-query.service';
import { OrqspaceAccessService } from '../shared/orqspace-access.service';
import { OrderLifecycleService, type OrderRow } from './order-lifecycle.service';
import { OrderPaymentsService } from './order-payments.service';

/** Authorization-aware entry points for workspace and customer order actions. */
@Injectable()
export class OrderActionsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly lifecycle: OrderLifecycleService,
    private readonly payments: OrderPaymentsService,
    private readonly query: OrdersQueryService,
    private readonly access: OrqspaceAccessService,
  ) {}

  accept(user: AuthUser, input: OrderActionInput) {
    return this.workspaceTransition(user, input.orderId, 'ACCEPTED', input.note);
  }

  reject(user: AuthUser, input: OrderReasonInput) {
    return this.workspaceTransition(user, input.orderId, 'REJECTED', input.reason);
  }

  startPreparing(user: AuthUser, input: OrderActionInput) {
    return this.workspaceTransition(user, input.orderId, 'PREPARING', input.note);
  }

  markReady(user: AuthUser, input: OrderActionInput) {
    return this.workspaceTransition(user, input.orderId, 'READY_FOR_FULFILMENT', input.note);
  }

  /** Workspace chooses customer pickup as the fulfilment method. */
  markAwaitingPickup(user: AuthUser, input: OrderActionInput) {
    return this.workspaceTransition(user, input.orderId, 'AWAITING_CUSTOMER_PICKUP', input.note);
  }

  confirmCustomerPickup(user: AuthUser, input: OrderActionInput) {
    return this.workspaceTransition(user, input.orderId, 'PICKED_UP', input.note);
  }

  /** Back to READY_FOR_FULFILMENT after a failed delivery or a changed pickup plan. */
  reopenForFulfilment(user: AuthUser, input: OrderActionInput) {
    return this.workspaceTransition(user, input.orderId, 'READY_FOR_FULFILMENT', input.note);
  }

  cancelByWorkspace(user: AuthUser, input: OrderReasonInput) {
    return this.workspaceTransition(user, input.orderId, 'CANCELLED', input.reason);
  }

  async markReturned(user: AuthUser, input: MarkOrderReturnedInput) {
    const order = await this.query.findOrder(input.orderId);
    const actor = await this.access.assertCanManage(user, order.orqspaceId);
    const updated = await this.lifecycle.transition({
      orderId: order.id,
      to: 'RETURNED',
      actor: { userId: actor.userId, role: actor.role },
      reason: input.reason,
      restock: input.restock,
      metadata: { restock: input.restock },
    });
    return this.query.getForWorkspace(user, updated.id);
  }

  /** Declining a return puts the order back to the status it had before the request. */
  async declineReturn(user: AuthUser, input: OrderReasonInput) {
    const order = await this.query.findOrder(input.orderId);
    if (order.orderStatus !== 'RETURN_REQUESTED') throw new BadRequestException('No return was requested');
    const [requested] = await this.db
      .select({ fromStatus: orderStatusHistory.fromStatus })
      .from(orderStatusHistory)
      .where(and(eq(orderStatusHistory.orderId, order.id), eq(orderStatusHistory.toStatus, 'RETURN_REQUESTED')))
      .orderBy(desc(orderStatusHistory.createdAt))
      .limit(1);
    const previous: OrderStatus = requested?.fromStatus === 'PICKED_UP' ? 'PICKED_UP' : 'DELIVERED';
    return this.workspaceTransition(user, order.id, previous, input.reason);
  }

  async recordPayment(user: AuthUser, input: RecordOrderPaymentInput) {
    const order = await this.query.findOrder(input.orderId);
    const actor = await this.access.assertCanManage(user, order.orqspaceId);
    if (input.status === 'FAILED' && !input.failureReason) throw new BadRequestException('Add a failure reason');
    await this.db.transaction((tx) =>
      this.payments.record(tx, {
        orderId: order.id,
        kind: input.kind,
        method: input.method,
        status: input.status,
        amount: input.amount,
        provider: input.provider ?? 'MANUAL',
        providerReference: input.providerReference ?? null,
        failureReason: input.failureReason ?? null,
        recordedByUserId: actor.userId,
      }),
    );
    return this.query.getForWorkspace(user, order.id);
  }

  async cancelByCustomer(user: AuthUser, input: OrderReasonInput) {
    await this.assertCustomer(user, input.orderId);
    await this.lifecycle.transition({
      orderId: input.orderId,
      to: 'CANCELLED',
      actor: { userId: user.id, role: 'CUSTOMER' },
      reason: input.reason,
    });
    return this.query.getForCustomer(user, input.orderId);
  }

  async requestReturn(user: AuthUser, input: OrderReasonInput) {
    await this.assertCustomer(user, input.orderId);
    await this.lifecycle.transition({
      orderId: input.orderId,
      to: 'RETURN_REQUESTED',
      actor: { userId: user.id, role: 'CUSTOMER' },
      reason: input.reason,
    });
    return this.query.getForCustomer(user, input.orderId);
  }

  private async workspaceTransition(user: AuthUser, orderId: string, to: OrderStatus, reason?: string | null) {
    const order = await this.query.findOrder(orderId);
    const actor = await this.access.assertCanManage(user, order.orqspaceId);
    const updated: OrderRow = await this.lifecycle.transition({
      orderId,
      to,
      actor: { userId: actor.userId, role: actor.role },
      reason: reason ?? null,
    });
    return this.query.getForWorkspace(user, updated.id);
  }

  private async assertCustomer(user: AuthUser, orderId: string) {
    const order = await this.query.findOrder(orderId);
    if (order.customerId !== user.id) throw new NotFoundException('Order not found');
  }
}
