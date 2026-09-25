import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

export class CreateCouponDto {
  @IsString()
  @MaxLength(255)
  name!: string;

  @IsString()
  @MaxLength(255)
  code!: string;

  @IsString()
  @IsIn(["Percentage", "Fixed Amount"])
  @IsOptional()
  type?: string;

  @IsNumber()
  @Min(0)
  discount!: number;

  @IsNumber()
  @Min(0)
  totalAmount!: number;

  @IsBoolean()
  @IsOptional()
  customerLogin?: boolean;

  @IsBoolean()
  @IsOptional()
  freeShipping?: boolean;

  @IsString()
  dateStart!: string;

  @IsString()
  dateEnd!: string;

  @IsInt()
  @Min(0)
  usesPerCoupon!: number;

  @IsInt()
  @Min(0)
  usesPerCustomer!: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateCouponDto {
  @IsString()
  @MaxLength(255)
  @IsOptional()
  name?: string;

  @IsString()
  @MaxLength(255)
  @IsOptional()
  code?: string;

  @IsString()
  @IsIn(["Percentage", "Fixed Amount"])
  @IsOptional()
  type?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  discount?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  totalAmount?: number;

  @IsBoolean()
  @IsOptional()
  customerLogin?: boolean;

  @IsBoolean()
  @IsOptional()
  freeShipping?: boolean;

  @IsString()
  @IsOptional()
  dateStart?: string;

  @IsString()
  @IsOptional()
  dateEnd?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  usesPerCoupon?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  usesPerCustomer?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
