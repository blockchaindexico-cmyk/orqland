import { gql } from 'graphql-request';

const ORDER_LIST_FIELDS = `
  id
  orderNumber
  orderStatus
  paymentMethod
  paymentStatus
  requestedFulfilment
  fulfilmentMethod
  totalAmount
  itemCount
  allowedNextStatuses
  createdAt
  buyerSnapshot { name phone }
  items { id title variantLabel quantity }
`;

const ORDER_DETAIL_FIELDS = `
  id
  orderNumber
  checkoutId
  orderStatus
  paymentMethod
  paymentStatus
  requestedFulfilment
  fulfilmentMethod
  subtotalBase
  totalGst
  deliveryFee
  discountTotal
  totalAmount
  itemCount
  allowedNextStatuses
  customerNote
  rejectionReason
  cancellationReason
  createdAt
  buyerSnapshot { name phone email orqUserId }
  deliveryAddressSnapshot { recipientName recipientPhone doorNo street landmark city state pincode latitude longitude }
  items { id title variantLabel sku imageUrl quantity unitBasePrice gstPercentage unitTotalPrice lineTotal }
  history { id fromStatus toStatus actorRole actorName reason createdAt }
  payments { id kind method status amount provider providerReference occurredAt }
  delivery {
    id taskNumber status mode needsAttention attentionReason codAmount selfStaffName
    agent { displayName phone vehicleNumberMasked }
  }
`;

export const ORQSPACE_ORDERS_QUERY = gql`
  query OrqspaceOrders($filter: OrqspaceOrdersFilterInput!) {
    orqspaceOrders(filter: $filter) { total page pageSize items { ${ORDER_LIST_FIELDS} } }
  }
`;

export const ORQSPACE_ORDER_COUNTS_QUERY = gql`
  query OrqspaceOrderCounts($orqspaceId: ID!) {
    orqspaceOrderCounts(orqspaceId: $orqspaceId) { status count }
  }
`;

export const ORQSPACE_ORDER_QUERY = gql`
  query OrqspaceOrder($orderId: ID!) {
    orqspaceOrder(orderId: $orderId) { ${ORDER_DETAIL_FIELDS} }
  }
`;

const actionMutation = (name: string, inputType: string) => gql`
  mutation ${name.charAt(0).toUpperCase() + name.slice(1)}($input: ${inputType}!) {
    ${name}(input: $input) { ${ORDER_DETAIL_FIELDS} }
  }
`;

export const ORDER_ACTION_MUTATIONS = {
  acceptOrder: actionMutation('acceptOrder', 'OrderActionInput'),
  startPreparingOrder: actionMutation('startPreparingOrder', 'OrderActionInput'),
  markOrderReady: actionMutation('markOrderReady', 'OrderActionInput'),
  markOrderAwaitingPickup: actionMutation('markOrderAwaitingPickup', 'OrderActionInput'),
  confirmCustomerPickup: actionMutation('confirmCustomerPickup', 'OrderActionInput'),
  reopenOrderForFulfilment: actionMutation('reopenOrderForFulfilment', 'OrderActionInput'),
  rejectOrder: actionMutation('rejectOrder', 'OrderReasonInput'),
  cancelOrderByWorkspace: actionMutation('cancelOrderByWorkspace', 'OrderReasonInput'),
  declineOrderReturn: actionMutation('declineOrderReturn', 'OrderReasonInput'),
  markOrderReturned: actionMutation('markOrderReturned', 'MarkOrderReturnedInput'),
  recordOrderPayment: actionMutation('recordOrderPayment', 'RecordOrderPaymentInput'),
} as const;

export type OrderActionName = keyof typeof ORDER_ACTION_MUTATIONS;
