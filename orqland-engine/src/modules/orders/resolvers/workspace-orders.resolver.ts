import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser, type AuthUser } from '@/core/decorators/current-user.decorator';
import { GqlAuthGuard } from '@/core/guards/gql-auth.guard';
import {
  MarkOrderReturnedInput,
  OrderActionInput,
  OrderReasonInput,
  RecordOrderPaymentInput,
} from '../dto/inputs/order-action.inputs';
import { OrqspaceOrdersFilterInput } from '../dto/inputs/orqspace-orders-filter.input';
import { OrderPageType, OrderStatusCountType, OrderType } from '../dto/types/order.type';
import { OrderActionsService } from '../services/lifecycle/order-actions.service';
import { OrdersQueryService } from '../services/orders-query.service';

/** Order Management page (workspace dashboard). */
@Resolver(() => OrderType)
@UseGuards(GqlAuthGuard)
export class WorkspaceOrdersResolver {
  constructor(
    private readonly query: OrdersQueryService,
    private readonly actions: OrderActionsService,
  ) {}

  @Query(() => OrderPageType)
  orqspaceOrders(@CurrentUser() user: AuthUser, @Args('filter') filter: OrqspaceOrdersFilterInput) {
    return this.query.listForOrqspace(user, filter);
  }

  @Query(() => [OrderStatusCountType])
  orqspaceOrderCounts(@CurrentUser() user: AuthUser, @Args('orqspaceId', { type: () => ID }) orqspaceId: string) {
    return this.query.statusCounts(user, orqspaceId);
  }

  @Query(() => OrderType)
  orqspaceOrder(@CurrentUser() user: AuthUser, @Args('orderId', { type: () => ID }) orderId: string) {
    return this.query.getForWorkspace(user, orderId);
  }

  @Mutation(() => OrderType)
  acceptOrder(@CurrentUser() user: AuthUser, @Args('input') input: OrderActionInput) {
    return this.actions.accept(user, input);
  }

  @Mutation(() => OrderType)
  rejectOrder(@CurrentUser() user: AuthUser, @Args('input') input: OrderReasonInput) {
    return this.actions.reject(user, input);
  }

  @Mutation(() => OrderType)
  startPreparingOrder(@CurrentUser() user: AuthUser, @Args('input') input: OrderActionInput) {
    return this.actions.startPreparing(user, input);
  }

  @Mutation(() => OrderType)
  markOrderReady(@CurrentUser() user: AuthUser, @Args('input') input: OrderActionInput) {
    return this.actions.markReady(user, input);
  }

  @Mutation(() => OrderType)
  markOrderAwaitingPickup(@CurrentUser() user: AuthUser, @Args('input') input: OrderActionInput) {
    return this.actions.markAwaitingPickup(user, input);
  }

  @Mutation(() => OrderType)
  confirmCustomerPickup(@CurrentUser() user: AuthUser, @Args('input') input: OrderActionInput) {
    return this.actions.confirmCustomerPickup(user, input);
  }

  @Mutation(() => OrderType)
  reopenOrderForFulfilment(@CurrentUser() user: AuthUser, @Args('input') input: OrderActionInput) {
    return this.actions.reopenForFulfilment(user, input);
  }

  @Mutation(() => OrderType)
  cancelOrderByWorkspace(@CurrentUser() user: AuthUser, @Args('input') input: OrderReasonInput) {
    return this.actions.cancelByWorkspace(user, input);
  }

  @Mutation(() => OrderType)
  markOrderReturned(@CurrentUser() user: AuthUser, @Args('input') input: MarkOrderReturnedInput) {
    return this.actions.markReturned(user, input);
  }

  @Mutation(() => OrderType)
  declineOrderReturn(@CurrentUser() user: AuthUser, @Args('input') input: OrderReasonInput) {
    return this.actions.declineReturn(user, input);
  }

  @Mutation(() => OrderType)
  recordOrderPayment(@CurrentUser() user: AuthUser, @Args('input') input: RecordOrderPaymentInput) {
    return this.actions.recordPayment(user, input);
  }
}
