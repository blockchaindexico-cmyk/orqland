/**
 * Order Management end-to-end spec (real PostgreSQL). Covers: idempotent multi-line checkout with snapshots,
 * uniform stock reservation for multi-variant and single products (default variant, review §2.1),
 * PRODUCT-only scope (review §2.2), workspace authorization through the standalone helper (review §2.3),
 * the preparation lifecycle, oversell protection under concurrency, stock release/restore,
 * customer pickup, payments, cancellation and returns.
 *
 * Run with `pnpm run test:e2e` (see test/jest-e2e.json).
 */
import {
  advanceToReady,
  call,
  gql,
  gqlError,
  PLACE_ORDER,
  SEED,
  sqlQuery,
  startE2eApp,
  stopE2eApp,
  variantStock,
} from './testing/e2e-harness';

const ORDER = `query($id: ID!) { orqspaceOrder(orderId: $id) { orderStatus paymentStatus fulfilmentMethod allowedNextStatuses items { variantId variantLabel sku } history { toStatus actorRole } } }`;

const place = (key: string, items: Record<string, unknown>[], extra: Record<string, unknown> = {}) =>
  call(SEED.customer, PLACE_ORDER, {
    input: { idempotencyKey: key, items, paymentMethod: 'ONLINE', requestedFulfilment: 'PICKUP', ...extra },
  });

beforeAll(startE2eApp);
afterAll(stopE2eApp);

describe('Checkout & inventory (review §2.1 — every product has a variant)', () => {
  it('places one order with snapshots and reserves stock idempotently', async () => {
    const input = [{ listingId: SEED.listingVariants, variantId: SEED.variantSmall, quantity: 2 }];
    const first = (await place('orders-e2e-0001', input)).data.placeOrder;
    const replay = (await place('orders-e2e-0001', input)).data.placeOrder;
    expect(first.replayed).toBe(false);
    expect(replay.replayed).toBe(true);
    expect(replay.orders[0].id).toBe(first.orders[0].id);
    expect(first.orders[0]).toMatchObject({ orderStatus: 'PLACED', totalAmount: '420.00' });
    expect(await variantStock(SEED.variantSmall)).toBe(8);
  });

  it('resolves the default variant of a has_variants = false product and reserves its stock the same way', async () => {
    const before = await variantStock(SEED.variantSimpleDefault);
    const body = await place('orders-e2e-simple', [{ listingId: SEED.listingSimple, quantity: 3 }]);
    const order = body.data.placeOrder.orders[0];
    expect(order.items[0].variantId).toBe(SEED.variantSimpleDefault);
    expect(order.totalAmount).toBe('1512.00');
    expect(await variantStock(SEED.variantSimpleDefault)).toBe(before - 3);
    const [reservation] = await sqlQuery<{ variant_id: string; status: string }>(
      'select variant_id, status from order_inventory_reservations where order_id = $1',
      [order.id],
    );
    expect(reservation).toEqual({ variant_id: SEED.variantSimpleDefault, status: 'RESERVED' });
  });

  it('requires an explicit option for multi-variant listings', async () => {
    const body = await place('orders-e2e-novariant', [{ listingId: SEED.listingVariants, quantity: 1 }]);
    expect(body.errors?.[0].message).toMatch(/Choose an option/);
  });

  it('rejects SERVICE listings — they follow the booking pipeline (review §2.2)', async () => {
    const body = await place('orders-e2e-service', [{ listingId: SEED.listingService, quantity: 1 }]);
    expect(body.errors?.[0].message).toMatch(/SERVICE listings are booked/);
  });

  it('never oversells under concurrent checkouts', async () => {
    const remaining = await variantStock(SEED.variantSmall);
    const attempts = await Promise.all(
      Array.from({ length: 4 }, (_, i) => place(`orders-race-${i}-xxxxxxxx`, [{ listingId: SEED.listingVariants, variantId: SEED.variantSmall, quantity: remaining - 1 }])),
    );
    expect(attempts.filter((a) => a.data?.placeOrder).length).toBe(1);
    expect(attempts.filter((a) => a.errors?.[0]?.message.includes('not have enough stock')).length).toBe(3);
    expect(await variantStock(SEED.variantSmall)).toBe(1);
  });
});

describe('Workspace authorization (review §2.3 — standalone assertWorkspaceAccess helper)', () => {
  it('allows the workspace owner, blocks other users and allows platform admins as an override', async () => {
    const q = `query { orqspaceOrderCounts(orqspaceId: "${SEED.orqspace}") { status count } }`;
    expect((await gql(SEED.owner, q)).orqspaceOrderCounts.length).toBeGreaterThan(0);
    expect(await gqlError(SEED.customer, q)).toMatch(/do not manage/);
    expect(await gqlError(SEED.agentRavi, q)).toMatch(/do not manage/);
    expect((await gql(SEED.admin, q)).orqspaceOrderCounts.length).toBeGreaterThan(0);
  });
});

describe('Order lifecycle', () => {
  it('releases stock on rejection and on customer cancellation', async () => {
    const before = await variantStock(SEED.variantSimpleDefault);
    const rejected = (await place('orders-e2e-reject', [{ listingId: SEED.listingSimple, quantity: 1 }])).data.placeOrder.orders[0];
    await gql(SEED.owner, `mutation($i: OrderReasonInput!) { rejectOrder(input: $i) { orderStatus } }`, { i: { orderId: rejected.id, reason: 'Closed today' } });
    expect(await variantStock(SEED.variantSimpleDefault)).toBe(before);

    const cancelled = (await place('orders-e2e-cancel', [{ listingId: SEED.listingSimple, quantity: 2 }])).data.placeOrder.orders[0];
    await gql(SEED.customer, `mutation($i: OrderReasonInput!) { cancelMyOrder(input: $i) { orderStatus } }`, { i: { orderId: cancelled.id, reason: 'Changed my mind' } });
    expect(await variantStock(SEED.variantSimpleDefault)).toBe(before);
    expect(await gqlError(SEED.customer, `mutation($i: OrderReasonInput!) { cancelMyOrder(input: $i) { orderStatus } }`, { i: { orderId: cancelled.id, reason: 'again' } })).toMatch(/Cannot move order/);
  });

  it('runs customer pickup with a recorded online payment', async () => {
    const order = (await place('orders-e2e-pickup', [{ listingId: SEED.listingSimple, quantity: 2 }])).data.placeOrder.orders[0];
    await advanceToReady(order.id);
    await gql(SEED.owner, `mutation($id: ID!) { markOrderAwaitingPickup(input: { orderId: $id }) { orderStatus } }`, { id: order.id });
    await gql(SEED.owner, `mutation($i: RecordOrderPaymentInput!) { recordOrderPayment(input: $i) { paymentStatus } }`, {
      i: { orderId: order.id, kind: 'PAYMENT', method: 'ONLINE', amount: '1008.00', providerReference: 'UPI-REF-1' },
    });
    // A reused provider reference is refused with a clear message (not a raw database error).
    const other = (await place('orders-e2e-dup-ref', [{ listingId: SEED.listingSimple, quantity: 1 }])).data.placeOrder.orders[0];
    expect(
      await gqlError(SEED.owner, `mutation($i: RecordOrderPaymentInput!) { recordOrderPayment(input: $i) { paymentStatus } }`, {
        i: { orderId: other.id, kind: 'PAYMENT', method: 'ONLINE', amount: '504.00', providerReference: 'UPI-REF-1' },
      }),
    ).toBe('Payment reference UPI-REF-1 is already recorded');
    const done = await gql(SEED.owner, `mutation($id: ID!) { confirmCustomerPickup(input: { orderId: $id }) { orderStatus paymentStatus fulfilmentMethod } }`, { id: order.id });
    expect(done.confirmCustomerPickup).toMatchObject({ orderStatus: 'PICKED_UP', paymentStatus: 'PAID', fulfilmentMethod: 'PICKUP' });
    const detail = (await gql(SEED.owner, ORDER, { id: order.id })).orqspaceOrder;
    expect(detail.history.map((h: { toStatus: string }) => h.toStatus)).toEqual(['PLACED', 'ACCEPTED', 'PREPARING', 'READY_FOR_FULFILMENT', 'AWAITING_CUSTOMER_PICKUP', 'PICKED_UP']);
    expect(detail.items[0]).toMatchObject({ variantId: SEED.variantSimpleDefault, variantLabel: null, sku: 'BDS-STD' });
  });

  it('handles a return request with restocking and a refund', async () => {
    const order = (await place('orders-e2e-return', [{ listingId: SEED.listingSimple, quantity: 1 }])).data.placeOrder.orders[0];
    await advanceToReady(order.id);
    await gql(SEED.owner, `mutation($id: ID!) { markOrderAwaitingPickup(input: { orderId: $id }) { orderStatus } }`, { id: order.id });
    await gql(SEED.owner, `mutation($i: RecordOrderPaymentInput!) { recordOrderPayment(input: $i) { paymentStatus } }`, {
      i: { orderId: order.id, kind: 'PAYMENT', method: 'ONLINE', amount: '504.00', providerReference: 'UPI-REF-2' },
    });
    await gql(SEED.owner, `mutation($id: ID!) { confirmCustomerPickup(input: { orderId: $id }) { orderStatus } }`, { id: order.id });
    const stockAfterSale = await variantStock(SEED.variantSimpleDefault);

    await gql(SEED.customer, `mutation($i: OrderReasonInput!) { requestOrderReturn(input: $i) { orderStatus } }`, { i: { orderId: order.id, reason: 'Dent on the lid' } });
    const returned = await gql(SEED.owner, `mutation($i: MarkOrderReturnedInput!) { markOrderReturned(input: $i) { orderStatus paymentStatus } }`, {
      i: { orderId: order.id, reason: 'Inspected — resaleable', restock: true },
    });
    expect(returned.markOrderReturned).toMatchObject({ orderStatus: 'RETURNED', paymentStatus: 'REFUND_PENDING' });
    expect(await variantStock(SEED.variantSimpleDefault)).toBe(stockAfterSale + 1);
    const refunded = await gql(SEED.owner, `mutation($i: RecordOrderPaymentInput!) { recordOrderPayment(input: $i) { paymentStatus } }`, {
      i: { orderId: order.id, kind: 'REFUND', method: 'ONLINE', amount: '504.00', providerReference: 'UPI-RF-2' },
    });
    expect(refunded.recordOrderPayment.paymentStatus).toBe('REFUNDED');
  });
});
