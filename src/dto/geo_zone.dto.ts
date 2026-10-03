import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
  MaxLength,
} from "class-validator";
import { Type } from "class-transformer";

export class GeoZoneLocationDto {
  @IsUUID()
  @IsNotEmpty()
  countryId!: string;

  @IsUUID()
  @IsOptional()
  zoneId?: string;
}

export class CreateGeoZoneDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GeoZoneLocationDto)
  locations!: GeoZoneLocationDto[];
}

export class UpdateGeoZoneDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @IsOptional()
  name?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GeoZoneLocationDto)
  @IsOptional()
  locations?: GeoZoneLocationDto[];
}