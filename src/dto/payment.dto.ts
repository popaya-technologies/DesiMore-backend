import {
  IsString,
  IsNumber,
  Min,
  Matches,
  IsNotEmpty,
  ValidateNested,
  IsOptional,
} from "class-validator";
import { Type } from "class-transformer";
import { AddressDto, CreateOrderDto } from "./order.dto";

export class ProcessPaymentDto {
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @IsString()
  @Matches(/^\d{13,19}$/, { message: "Invalid card number" })
  cardNumber: string;

  @IsString()
  @Matches(/^(0[1-9]|1[0-2])\/?([0-9]{2})$/, {
    message: "Invalid expiration date (MM/YY)",
  })
  expirationDate: string;

  @IsString()
  @Matches(/^\d{3,4}$/, { message: "Invalid CVV" })
  cardCode: string;

  @IsNumber()
  @Min(0.01)
  amount: number;
}

export class RefundPaymentDto {
  @IsNumber()
  @Min(0.01)
  @IsNotEmpty()
  amount: number;
}

// New DTO to support pay-then-create flow (no pre-existing orderId)
export class CheckoutPaymentDto extends CreateOrderDto {
  @IsString()
  @Matches(/^\d{13,19}$/u, { message: "Invalid card number" })
  cardNumber: string;

  @IsString()
  @Matches(/^(0[1-9]|1[0-2])\/?([0-9]{2})$/u, {
    message: "Invalid expiration date (MM/YY)",
  })
  expirationDate: string;

  @IsString()
  @Matches(/^\d{3,4}$/u, { message: "Invalid CVV" })
  cardCode: string;

  // Allow optional explicit amount, but it will be ignored in favor of server-side cart total
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;
}
