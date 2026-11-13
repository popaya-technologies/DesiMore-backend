import { Type } from "class-transformer";
import { IsIn, IsUUID, ValidateNested } from "class-validator";
import { AddressDto } from "./order.dto";
import { UPS_SHIPPING_CODES, UpsShippingCode } from "../shipping.constants";

export class ShippingQuoteDto {
  @IsUUID()
  cartId: string;

  @ValidateNested()
  @Type(() => AddressDto)
  shippingAddress: AddressDto;
}

export class SelectShippingDto extends ShippingQuoteDto {
  @IsIn(UPS_SHIPPING_CODES)
  shippingCode: UpsShippingCode;
}
