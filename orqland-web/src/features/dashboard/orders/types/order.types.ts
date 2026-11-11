export type OrderStatus =
  | 'PLACED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'PREPARING'
  | 'READY_FOR_FULFILMENT'
  | 'AWAITING_CUSTOMER_PICKUP'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERY_FAILED'
  | 'DELIVERED'
  | 'PICKED_UP'
  | 'CANCELLED'
  | 'RETURN_REQUESTED'
  | 'RETURNED';

export type PaymentMethod = 'ONLINE' | 'COD';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUND_PENDING' | 'PARTIALLY_REFUNDED' | 'REFUNDED';
export type FulfilmentMethod = 'SELF_DELIVERY' | 'AGENT_DELIVERY' | 'PICKUP';

export interface AddressSnapshot {
  recipientName: string | null;
  recipientPhone: string | null;
  doorNo: string | null;
  street: string | null;
  landmark: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface OrderItem {
  id: string;
  title: string;
  variantLabel: string | null;
  sku: string | null;
  imageUrl: string | null;
  quantity: number;
  unitBasePrice: string;
  gstPercentage: string;
  unitTotalPrice: string;
  lineTotal: string;
}

export interface OrderHistoryEntry {
  id: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  actorRole: string;
  actorName: string | null;
  reason: string | null;
  createdAt: string;
}

export interface OrderPayment {
  id: string;
  kind: 'PAYMENT' | 'REFUND';
  method: PaymentMethod;
  status: string;
  amount: string;
  provider: string | null;
  providerReference: string | null;
  occurredAt: string;
}

export interface OrderDeliverySummary {
  id: string;
  taskNumber: string;
  status: string;
  mode: 'SELF' | 'AGENT';
  needsAttention: boolean;
  attentionReason: string | null;
  codAmount: string;
  selfStaffName: string | null;
  agent: { displayName: string; phone: string | null; vehicleNumberMasked: string } | null;
}

export interface OrderListItem {
  id: string;
  orderNumber: string;
  orderStatus: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  requestedFulfilment: 'DELIVERY' | 'PICKUP';
  fulfilmentMethod: FulfilmentMethod | null;
  totalAmount: string;
  itemCount: number;
  buyerSnapshot: { name: string; phone: string | null };
  items: Pick<OrderItem, 'id' | 'title' | 'variantLabel' | 'quantity'>[];
  allowedNextStatuses: OrderStatus[];
  createdAt: string;
}

export interface OrderDetail extends Omit<OrderListItem, 'items' | 'buyerSnapshot'> {
  checkoutId: string;
  subtotalBase: string;
  totalGst: string;
  deliveryFee: string;
  discountTotal: string;
  buyerSnapshot: { name: string; phone: string | null; email: string | null; orqUserId: string };
  deliveryAddressSnapshot: AddressSnapshot | null;
  customerNote: string | null;
  rejectionReason: string | null;
  cancellationReason: string | null;
  items: OrderItem[];
  history: OrderHistoryEntry[];
  payments: OrderPayment[];
  delivery: OrderDeliverySummary | null;
}

export interface OrderPage {
  items: OrderListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface OrdersFilter {
  orqspaceId: string;
  statuses?: OrderStatus[];
  paymentMethod?: PaymentMethod;
  search?: string;
  page: number;
  pageSize: number;
}

/** Queue tabs shown on the Order Management page. */
export const ORDER_QUEUES: { key: string; label: string; statuses: OrderStatus[] | null }[] = [
  { key: 'new', label: 'New', statuses: ['PLACED'] },
  { key: 'preparing', label: 'In preparation', statuses: ['ACCEPTED', 'PREPARING'] },
  { key: 'ready', label: 'Ready', statuses: ['READY_FOR_FULFILMENT', 'AWAITING_CUSTOMER_PICKUP'] },
  { key: 'out', label: 'Out for delivery', statuses: ['OUT_FOR_DELIVERY'] },
  { key: 'attention', label: 'Needs action', statuses: ['DELIVERY_FAILED', 'RETURN_REQUESTED'] },
  { key: 'completed', label: 'Completed', statuses: ['DELIVERED', 'PICKED_UP'] },
  { key: 'closed', label: 'Closed', statuses: ['REJECTED', 'CANCELLED', 'RETURNED'] },
  { key: 'all', label: 'All', statuses: null },
];
