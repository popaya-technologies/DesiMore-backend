import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from "class-validator";

// ISO 4217 style: exactly 3 letters (USD, EUR, INR).
const CURRENCY_CODE_PATTERN = /^[A-Za-z]{3}$/;
const CURRENCY_CODE_MESSAGE = "Code must be exactly 3 letters (e.g. USD)";

export class CreateCurrencyDto {
  @IsString()
  @IsNotEmpty({ message: "Currency title is required" })
  @MaxLength(255)
  currencyTitle!: string;

  @IsString()
  @Matches(CURRENCY_CODE_PATTERN, { message: CURRENCY_CODE_MESSAGE })
  code!: string;

  @IsString()
  @MaxLength(50)
  @IsOptional()
  symbolLeft?: string;

  @IsString()
  @MaxLength(50)
  @IsOptional()
  symbolRight?: string;

  @IsInt({ message: "Decimal places must be a whole number" })
  @Min(0, { message: "Decimal places must be between 0 and 8" })
  @Max(8, { message: "Decimal places must be between 0 and 8" })
  @IsOptional()
  decimalPlaces?: number;

  // How much of this currency equals 1 unit of the default currency.
  @IsNumber({ maxDecimalPlaces: 8 }, { message: "Value must be a number with at most 8 decimals" })
  @IsPositive({ message: "Value must be greater than 0" })
  @IsOptional()
  value?: number;

  @IsBoolean()
  @IsOptional()
  status?: boolean;
}

export class UpdateCurrencyDto {
  @IsString()
  @IsNotEmpty({ message: "Currency title is required" })
  @MaxLength(255)
  @IsOptional()
  currencyTitle?: string;

  @IsString()
  @Matches(CURRENCY_CODE_PATTERN, { message: CURRENCY_CODE_MESSAGE })
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

  @IsInt({ message: "Decimal places must be a whole number" })
  @Min(0, { message: "Decimal places must be between 0 and 8" })
  @Max(8, { message: "Decimal places must be between 0 and 8" })
  @IsOptional()
  decimalPlaces?: number;

  @IsNumber({ maxDecimalPlaces: 8 }, { message: "Value must be a number with at most 8 decimals" })
  @IsPositive({ message: "Value must be greater than 0" })
  @IsOptional()
  value?: number;

  @IsBoolean()
  @IsOptional()
  status?: boolean;
}
