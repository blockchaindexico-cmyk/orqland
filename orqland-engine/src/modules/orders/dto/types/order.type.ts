import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import type {
  ActorRole,
  OrderFulfilmentMethod,
  OrderPaymentKind,
  OrderPaymentMethod,
  OrderPaymentRecordStatus,
  OrderPaymentStatus,
  OrderRequestedFulfilment,
  OrderStatus,
} from '@/infrastructure/database/schema';
import {
  ActorRoleGql,
  OrderFulfilmentMethodGql,
  OrderPaymentKindGql,
  OrderPaymentMethodGql,
  OrderPaymentRecordStatusGql,
  OrderPaymentStatusGql,
  OrderRequestedFulfilmentGql,
  OrderStatusGql,
} from '../enums/order.enums';

@ObjectType('AddressSnapshot')
export class AddressSnapshotType {
  @Field(() => String, { nullable: true }) recipientName: string | null;
  @Field(() => String, { nullable: true }) recipientPhone: string | null;
  @Field(() => String, { nullable: true }) doorNo: string | null;
  @Field(() => String, { nullable: true }) street: string | null;
  @Field(() => String, { nullable: true }) landmark: string | null;
  @Field(() => String, { nullable: true }) city: string | null;
  @Field(() => String, { nullable: true }) district: string | null;
  @Field(() => String, { nullable: true }) state: string | null;
  @Field(() => String, { nullable: true }) country: string | null;
  @Field(() => String, { nullable: true }) pincode: string | null;
  @Field(() => Number, { nullable: true }) latitude: number | null;
  @Field(() => Number, { nullable: true }) longitude: number | null;
}

@ObjectType('BuyerSnapshot')
export class BuyerSnapshotType {
  @Field() name: string;
  @Field(() => String, { nullable: true }) phone: string | null;
  @Field(() => String, { nullable: true }) email: string | null;
  @Field() orqUserId: string;
}

@ObjectType('OrderItem')
export class OrderItemType {
  @Field(() => ID) id: string;
  @Field(() => ID, { nullable: true }) listingId: string | null;
  @Field(() => ID, { nullable: true }) variantId: string | null;
  @Field() listingType: string;
  @Field() title: string;
  @Field(() => String, { nullable: true }) variantLabel: string | null;
  @Field(() => String, { nullable: true }) sku: string | null;
  @Field(() => String, { nullable: true }) imageUrl: string | null;
  @Field(() => Int) quantity: number;
  @Field() unitBasePrice: string;
  @Field() gstPercentage: string;
  @Field() unitGst: string;
  @Field() unitTotalPrice: string;
  @Field() lineTotal: string;
}

@ObjectType('OrderStatusHistoryEntry')
export class OrderStatusHistoryType {
  @Field(() => ID) id: string;
  @Field(() => OrderStatusGql, { nullable: true }) fromStatus: OrderStatus | null;
  @Field(() => OrderStatusGql) toStatus: OrderStatus;
  @Field(() => ActorRoleGql) actorRole: ActorRole;
  @Field(() => String, { nullable: true }) actorName: string | null;
  @Field(() => String, { nullable: true }) reason: string | null;
  @Field() createdAt: Date;
}

@ObjectType('OrderPayment')
export class OrderPaymentType {
  @Field(() => ID) id: string;
  @Field(() => OrderPaymentKindGql) kind: OrderPaymentKind;
  @Field(() => OrderPaymentMethodGql) method: OrderPaymentMethod;
  @Field(() => OrderPaymentRecordStatusGql) status: OrderPaymentRecordStatus;
  @Field() amount: string;
  @Field(() => String, { nullable: true }) provider: string | null;
  @Field(() => String, { nullable: true }) providerReference: string | null;
  @Field(() => String, { nullable: true }) failureReason: string | null;
  @Field() occurredAt: Date;
}

@ObjectType('Order')
export class OrderType {
  @Field(() => ID) id: string;
  @Field() orderNumber: string;
  @Field(() => ID) checkoutId: string;
  @Field(() => ID) customerId: string;
  @Field(() => ID) orqspaceId: string;
  @Field(() => OrderStatusGql) orderStatus: OrderStatus;
  @Field(() => OrderPaymentMethodGql) paymentMethod: OrderPaymentMethod;
  @Field(() => OrderPaymentStatusGql) paymentStatus: OrderPaymentStatus;
  @Field(() => OrderRequestedFulfilmentGql) requestedFulfilment: OrderRequestedFulfilment;
  @Field(() => OrderFulfilmentMethodGql, { nullable: true }) fulfilmentMethod: OrderFulfilmentMethod | null;
  @Field() currency: string;
  @Field() subtotalBase: string;
  @Field() totalGst: string;
  @Field() deliveryFee: string;
  @Field() discountTotal: string;
  @Field() totalAmount: string;
  @Field(() => BuyerSnapshotType) buyerSnapshot: BuyerSnapshotType;
  @Field(() => AddressSnapshotType, { nullable: true }) deliveryAddressSnapshot: AddressSnapshotType | null;
  @Field(() => String, { nullable: true }) customerNote: string | null;
  @Field(() => String, { nullable: true }) rejectionReason: string | null;
  @Field(() => String, { nullable: true }) cancellationReason: string | null;
  @Field(() => ActorRoleGql, { nullable: true }) cancelledByRole: ActorRole | null;
  @Field(() => Date, { nullable: true }) acceptedAt: Date | null;
  @Field(() => Date, { nullable: true }) preparingAt: Date | null;
  @Field(() => Date, { nullable: true }) readyAt: Date | null;
  @Field(() => Date, { nullable: true }) dispatchedAt: Date | null;
  @Field(() => Date, { nullable: true }) deliveredAt: Date | null;
  @Field(() => Date, { nullable: true }) completedAt: Date | null;
  @Field(() => Date, { nullable: true }) cancelledAt: Date | null;
  @Field(() => Int) version: number;
  @Field() createdAt: Date;
  @Field() updatedAt: Date;
  @Field(() => [OrderItemType]) items: OrderItemType[];
  @Field(() => Int) itemCount: number;
  /** Status transitions the calling workspace may perform next (drives action buttons). */
  @Field(() => [OrderStatusGql]) allowedNextStatuses: OrderStatus[];
}

@ObjectType('OrderPage')
export class OrderPageType {
  @Field(() => [OrderType]) items: OrderType[];
  @Field(() => Int) total: number;
  @Field(() => Int) page: number;
  @Field(() => Int) pageSize: number;
}

@ObjectType('OrderStatusCount')
export class OrderStatusCountType {
  @Field(() => OrderStatusGql) status: OrderStatus;
  @Field(() => Int) count: number;
}

@ObjectType('PlaceOrderResult')
export class PlaceOrderResultType {
  @Field(() => ID) checkoutId: string;
  @Field(() => [OrderType]) orders: OrderType[];
  /** True when an earlier request with the same idempotency key already created these orders. */
  @Field() replayed: boolean;
}

@ObjectType('CheckoutAddress')
export class CheckoutAddressType extends AddressSnapshotType {
  @Field(() => ID) id: string;
  @Field() addressType: string;
  @Field() isPrimary: boolean;
}
