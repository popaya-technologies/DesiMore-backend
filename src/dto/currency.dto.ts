import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

export class CreateCurrencyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  currencyTitle!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code!: string;

  @IsString()
  @MaxLength(50)
  @IsOptional()
  symbolLeft?: string;

  @IsString()
  @MaxLength(50)
  @IsOptional()
  symbolRight?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  decimalPlaces?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  value?: number;

  @IsBoolean()
  @IsOptional()
  status?: boolean;
}

export class UpdateCurrencyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @IsOptional()
  currencyTitle?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @IsOptional()
  code?: string;

  @IsString()
  @MaxLength(50)
  @IsOptional()
  symbolLeft?: string;

  @IsString()
  @MaxLength(50)
  @IsOptional()
  symbolRight?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  decimalPlaces?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  value?: number;

  @IsBoolean()
  @IsOptional()
  status?: boolean;
}