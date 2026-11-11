import { graphqlClient } from '@/lib/graphqlClient';
import {
  ORDER_ACTION_MUTATIONS,
  ORQSPACE_ORDER_COUNTS_QUERY,
  ORQSPACE_ORDER_QUERY,
  ORQSPACE_ORDERS_QUERY,
  type OrderActionName,
} from '../graphql/orders.graphql';
import type { OrderDetail, OrderPage, OrdersFilter, OrderStatus } from '../types/order.types';

export const ordersService = {
  async list(filter: OrdersFilter): Promise<OrderPage> {
    const data = await graphqlClient.request<{ orqspaceOrders: OrderPage }>(ORQSPACE_ORDERS_QUERY, { filter });
    return data.orqspaceOrders;
  },

  async counts(orqspaceId: string): Promise<Record<OrderStatus, number>> {
    const data = await graphqlClient.request<{ orqspaceOrderCounts: { status: OrderStatus; count: number }[] }>(ORQSPACE_ORDER_COUNTS_QUERY, { orqspaceId });
    return Object.fromEntries(data.orqspaceOrderCounts.map((c) => [c.status, c.count])) as Record<OrderStatus, number>;
  },

  async detail(orderId: string): Promise<OrderDetail> {
    const data = await graphqlClient.request<{ orqspaceOrder: OrderDetail }>(ORQSPACE_ORDER_QUERY, { orderId });
    return data.orqspaceOrder;
  },

  async action(name: OrderActionName, input: Record<string, unknown>): Promise<OrderDetail> {
    const data = await graphqlClient.request<Record<string, OrderDetail>>(ORDER_ACTION_MUTATIONS[name], { input });
    return data[name];
  },
};
