import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  ValidateNested,
  IsEmail,
  IsPhoneNumber,
  IsUUID,
  IsIn,
  IsBoolean,
  Matches,
  MaxLength,
} from "class-validator";
import { Type } from "class-transformer";
import { PaymentStatus } from "../entities/order.entity";
import { UPS_SHIPPING_CODES, UpsShippingCode } from "../shipping.constants";

export class AddressDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEmail()
  email: string;

  @IsPhoneNumber()
  phone: string;

  @IsString()
  address: string;

  @IsString()
  city: string;

  @IsString()
  state: string;

  @IsString()
  country: string;

  @IsString()
  zipCode: string;
}

export class CreateOrderDto {
  @IsString()
  @MaxLength(255)
  @IsOptional()
  giftVoucherCode?: string;

  @IsString()
  @MaxLength(255)
  @IsOptional()
  couponCode?: string;

  @IsIn(UPS_SHIPPING_CODES)
  @IsOptional()
  shippingCode?: UpsShippingCode;

  @ValidateNested()
  @Type(() => AddressDto)
  shippingAddress: AddressDto;

  @ValidateNested()
  @Type(() => AddressDto)
  @IsOptional()
  billingAddress?: AddressDto;

  @IsString()
  paymentMethod: string;

  @IsString()
  @MaxLength(10000)
  @IsOptional()
  notes?: string;

  @IsUUID()
  @IsOptional()
  cartId?: string;
}

export class UpdateOrderStatusDto {
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: "status must be a valid order status code",
  })
  status: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsBoolean()
  @IsOptional()
  notifyCustomer?: boolean;
}

export class UpdatePaymentStatusDto {
  @IsEnum(PaymentStatus)
  paymentStatus: PaymentStatus;

  @IsString()
  @IsOptional()
  transactionId?: string;
}

export class UpdateOrderTrackingDto {
  @IsString()
  carrier: string;

  @IsString()
  trackingNumber: string;
}
