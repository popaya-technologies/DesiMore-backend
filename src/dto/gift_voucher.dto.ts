import {
  IsBoolean,
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

export class CreateGiftVoucherDto {
  @IsString()
  @MaxLength(255)
  code!: string;

  @IsString()
  @MaxLength(255)
  fromName!: string;

  @IsEmail()
  @MaxLength(255)
  fromEmail!: string;

  @IsString()
  @MaxLength(255)
  toName!: string;

  @IsEmail()
  @MaxLength(255)
  toEmail!: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  theme?: string;

  @IsString()
  @IsOptional()
  message?: string;

  @IsNumber()
  @Min(0)
  amount!: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateGiftVoucherDto {
  @IsString()
  @MaxLength(255)
  @IsOptional()
  code?: string;

  @IsString()
  @MaxLength(255)
  @IsOptional()
  fromName?: string;

  @IsEmail()
  @MaxLength(255)
  @IsOptional()
  fromEmail?: string;

  @IsString()
  @MaxLength(255)
  @IsOptional()
  toName?: string;

  @IsEmail()
  @MaxLength(255)
  @IsOptional()
  toEmail?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  theme?: string;

  @IsString()
  @IsOptional()
  message?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  amount?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
