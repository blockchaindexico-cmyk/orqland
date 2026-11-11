import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, count, desc, eq, ilike, inArray, or, sql, type SQL } from 'drizzle-orm';
import type { AuthUser } from '@/core/decorators/current-user.decorator';
import { DRIZZLE, type DrizzleDB } from '@/infrastructure/database/drizzle.module';
import {
  orderItems,
  orderPayments,
  orders,
  orderStatusHistory,
  orqspaces,
  orqUserAddresses,
  orqUsers,
  type ActorRole,
} from '@/infrastructure/database/schema';
import type { MyOrdersFilterInput, OrqspaceOrdersFilterInput } from '../dto/inputs/orqspace-orders-filter.input';
import type {
  CheckoutAddressType,
  OrderItemType,
  OrderPageType,
  OrderPaymentType,
  OrderStatusCountType,
  OrderStatusHistoryType,
  OrderType,
} from '../dto/types/order.type';
import { allowedNextStatuses } from '../helpers/order-state-machine';
import type { OrderRow } from './lifecycle/order-lifecycle.service';
import { OrqspaceAccessService } from './shared/orqspace-access.service';

@Injectable()
export class OrdersQueryService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly access: OrqspaceAccessService,
  ) {}

  async listForOrqspace(user: AuthUser, filter: OrqspaceOrdersFilterInput): Promise<OrderPageType> {
    const actor = await this.access.assertCanManage(user, filter.orqspaceId);
    const conditions: SQL[] = [eq(orders.orqspaceId, filter.orqspaceId)];
    if (filter.statuses?.length) conditions.push(inArray(orders.orderStatus, filter.statuses));
    if (filter.paymentMethod) conditions.push(eq(orders.paymentMethod, filter.paymentMethod));
    if (filter.search?.trim()) {
      const term = `%${filter.search.trim()}%`;
      conditions.push(
        or(
          ilike(orders.orderNumber, term),
          sql`${orders.buyerSnapshot}->>'name' ILIKE ${term}`,
          sql`${orders.buyerSnapshot}->>'phone' ILIKE ${term}`,
        )!,
      );
    }
    const where = and(...conditions);

    const [{ total }] = await this.db.select({ total: count() }).from(orders).where(where);
    const rows = await this.db
      .select()
      .from(orders)
      .where(where)
      .orderBy(desc(orders.createdAt))
      .limit(filter.pageSize)
      .offset((filter.page - 1) * filter.pageSize);

    return {
      items: await this.toOrderTypes(rows, actor.role),
      total,
      page: filter.page,
      pageSize: filter.pageSize,
    };
  }

  async statusCounts(user: AuthUser, orqspaceId: string): Promise<OrderStatusCountType[]> {
    await this.access.assertCanManage(user, orqspaceId);
    const rows = await this.db
      .select({ status: orders.orderStatus, count: count() })
      .from(orders)
      .where(eq(orders.orqspaceId, orqspaceId))
      .groupBy(orders.orderStatus);
    return rows.map((r) => ({ status: r.status, count: r.count }));
  }

  async getForWorkspace(user: AuthUser, orderId: string): Promise<OrderType> {
    const order = await this.findOrder(orderId);
    const actor = await this.access.assertCanManage(user, order.orqspaceId);
    return (await this.toOrderTypes([order], actor.role))[0];
  }

  async listForCustomer(user: AuthUser, filter: MyOrdersFilterInput): Promise<OrderPageType> {
    const where = eq(orders.customerId, user.id);
    const [{ total }] = await this.db.select({ total: count() }).from(orders).where(where);
    const rows = await this.db
      .select()
      .from(orders)
      .where(where)
      .orderBy(desc(orders.createdAt))
      .limit(filter.pageSize)
      .offset((filter.page - 1) * filter.pageSize);
    return { items: await this.toOrderTypes(rows, 'CUSTOMER'), total, page: filter.page, pageSize: filter.pageSize };
  }

  async getForCustomer(user: AuthUser, orderId: string): Promise<OrderType> {
    const order = await this.findOrder(orderId);
    if (order.customerId !== user.id) throw new NotFoundException('Order not found');
    return (await this.toOrderTypes([order], 'CUSTOMER'))[0];
  }

  /** The customer's saved addresses for checkout (snapshotted into the order when placed). */
  async checkoutAddresses(user: AuthUser): Promise<CheckoutAddressType[]> {
    const rows = await this.db
      .select()
      .from(orqUserAddresses)
      .where(eq(orqUserAddresses.userId, user.id))
      .orderBy(desc(orqUserAddresses.isPrimary));
    return rows.map((a) => ({
      ...a,
      latitude: a.latitude === null ? null : Number(a.latitude),
      longitude: a.longitude === null ? null : Number(a.longitude),
    }));
  }

  async history(orderId: string): Promise<OrderStatusHistoryType[]> {
    return this.db
      .select({
        id: orderStatusHistory.id,
        fromStatus: orderStatusHistory.fromStatus,
        toStatus: orderStatusHistory.toStatus,
        actorRole: orderStatusHistory.actorRole,
        actorName: sql<string | null>`coalesce(${orqUsers.displayName}, ${orqUsers.fname})`,
        reason: orderStatusHistory.reason,
        createdAt: orderStatusHistory.createdAt,
      })
      .from(orderStatusHistory)
      .leftJoin(orqUsers, eq(orqUsers.id, orderStatusHistory.actorUserId))
      .where(eq(orderStatusHistory.orderId, orderId))
      .orderBy(asc(orderStatusHistory.createdAt));
  }

  async payments(orderId: string): Promise<OrderPaymentType[]> {
    return this.db
      .select({
        id: orderPayments.id,
        kind: orderPayments.kind,
        method: orderPayments.method,
        status: orderPayments.status,
        amount: orderPayments.amount,
        provider: orderPayments.provider,
        providerReference: orderPayments.providerReference,
        failureReason: orderPayments.failureReason,
        occurredAt: orderPayments.occurredAt,
      })
      .from(orderPayments)
      .where(eq(orderPayments.orderId, orderId))
      .orderBy(asc(orderPayments.occurredAt));
  }

  async orqspaceName(orqspaceId: string): Promise<string> {
    const [row] = await this.db.select({ name: orqspaces.name }).from(orqspaces).where(eq(orqspaces.id, orqspaceId));
    return row?.name ?? 'Workspace';
  }

  async findOrder(orderId: string): Promise<OrderRow> {
    const [order] = await this.db.select().from(orders).where(eq(orders.id, orderId));
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  /** Maps rows to the GraphQL type, loading all items for the page in a single query. */
  async toOrderTypes(rows: OrderRow[], viewerRole: ActorRole): Promise<OrderType[]> {
    if (!rows.length) return [];
    const items = await this.db
      .select()
      .from(orderItems)
      .where(
        inArray(
          orderItems.orderId,
          rows.map((r) => r.id),
        ),
      )
      .orderBy(asc(orderItems.createdAt));
    const byOrder = new Map<string, OrderItemType[]>();
    for (const item of items) byOrder.set(item.orderId, [...(byOrder.get(item.orderId) ?? []), item]);

    return rows.map((row) => {
      const orderItemsForRow = byOrder.get(row.id) ?? [];
      return {
        ...row,
        items: orderItemsForRow,
        itemCount: orderItemsForRow.reduce((sum, i) => sum + i.quantity, 0),
        allowedNextStatuses: allowedNextStatuses(row.orderStatus, viewerRole),
      };
    });
  }
}
