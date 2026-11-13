import { Type } from "class-transformer";
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from "class-validator";

// Only the parts of an address that decide tax: country (ISO-2 code or name) and
// state (zone code or name). Other address fields are accepted and ignored.
export class TaxAddressDto {
  @IsString()
  @IsNotEmpty({ message: "Country is required" })
  @MaxLength(255)
  country: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  state?: string;
}

export class TaxQuoteDto {
  @IsUUID()
  cartId: string;

  @ValidateNested()
  @Type(() => TaxAddressDto)
  shippingAddress: TaxAddressDto;

  // Billing address; when missing, the shipping address is used.
  @ValidateNested()
  @Type(() => TaxAddressDto)
  @IsOptional()
  paymentAddress?: TaxAddressDto;
}
