import { Field, ID, InputType } from '@nestjs/graphql';
import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';
import type { OrderPaymentKind, OrderPaymentMethod, OrderPaymentRecordStatus } from '@/infrastructure/database/schema';
import { OrderPaymentKindGql, OrderPaymentMethodGql, OrderPaymentRecordStatusGql } from '../enums/order.enums';

@InputType()
export class OrderActionInput {
  @Field(() => ID) @IsUUID() orderId: string;
  @Field({ nullable: true }) @IsOptional() @IsString() @MaxLength(500) note?: string;
}

@InputType()
export class OrderReasonInput {
  @Field(() => ID) @IsUUID() orderId: string;
  @Field() @IsString() @IsNotEmpty() @MaxLength(500) reason: string;
}

@InputType()
export class MarkOrderReturnedInput {
  @Field(() => ID) @IsUUID() orderId: string;
  @Field() @IsString() @IsNotEmpty() @MaxLength(500) reason: string;
  /** Put returned stock back into LIMITED inventory. */
  @Field() @IsBoolean() restock: boolean;
}

@InputType()
export class RecordOrderPaymentInput {
  @Field(() => ID) @IsUUID() orderId: string;
  @Field(() => OrderPaymentKindGql) @IsIn(Object.keys(OrderPaymentKindGql)) kind: OrderPaymentKind;
  @Field(() => OrderPaymentMethodGql) @IsIn(Object.keys(OrderPaymentMethodGql)) method: OrderPaymentMethod;
  @Field(() => OrderPaymentRecordStatusGql, { defaultValue: 'SUCCEEDED' })
  @IsIn(['SUCCEEDED', 'FAILED'])
  status: OrderPaymentRecordStatus = 'SUCCEEDED';
  @Field() @Matches(/^\d{1,10}(\.\d{1,2})?$/) amount: string;
  @Field({ nullable: true }) @IsOptional() @IsString() @MaxLength(40) provider?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() @MaxLength(120) providerReference?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() @MaxLength(500) failureReason?: string;
}
