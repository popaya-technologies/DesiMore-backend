import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

export class CreateProductReturnDto {
  @IsString()
  @MaxLength(100)
  orderId!: string;

  @IsOptional()
  @IsDateString()
  orderDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  customer?: string;

  @IsString()
  @MaxLength(255)
  firstName!: string;

  @IsString()
  @MaxLength(255)
  lastName!: string;

  @IsEmail()
  @MaxLength(255)
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  telephone?: string;

  @IsString()
  @MaxLength(500)
  product!: string;

  @IsString()
  @MaxLength(255)
  model!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  returnReason?: string;

  @IsBoolean()
  opened!: boolean;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  returnAction?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  returnStatus?: string;
}

export class UpdateProductReturnDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  orderId?: string;

  @IsOptional()
  @IsDateString()
  orderDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  customer?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  lastName?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  telephone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  product?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  model?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  returnReason?: string;

  @IsOptional()
  @IsBoolean()
  opened?: boolean;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  returnAction?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  returnStatus?: string;
}
