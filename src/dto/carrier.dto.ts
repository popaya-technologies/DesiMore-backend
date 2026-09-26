import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  IsUrl,
  Min,
  MaxLength,
} from "class-validator";

export class CreateCarrierDto {
  @IsString()
  @MaxLength(255)
  name!: string;

  @IsInt()
  @Min(0)
  trackingNoLength!: number;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  match?: string;

  @IsUrl()
  @IsOptional()
  @MaxLength(500)
  carrierUrl?: string;

  @IsInt()
  @Min(0)
  sortOrder!: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateCarrierDto {
  @IsString()
  @MaxLength(255)
  @IsOptional()
  name?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  trackingNoLength?: number;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  match?: string;

  @IsUrl()
  @IsOptional()
  @MaxLength(500)
  carrierUrl?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
