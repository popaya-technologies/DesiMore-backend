import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";

export class CreateZoneDto {
  @IsUUID()
  @IsNotEmpty()
  countryId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  code?: string;

  @IsBoolean()
  status!: boolean;
}

export class UpdateZoneDto {
  @IsUUID()
  @IsOptional()
  countryId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  code?: string;

  @IsBoolean()
  @IsOptional()
  status?: boolean;
}