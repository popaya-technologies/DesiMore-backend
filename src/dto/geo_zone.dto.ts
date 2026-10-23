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
  @IsUUID("all", { message: "Please select a country for every row" })
  countryId!: string;

  // Missing means "All Zones" of the country.
  @IsUUID("all", { message: "Please select a valid zone" })
  @IsOptional()
  zoneId?: string;
}

export class CreateGeoZoneDto {
  @IsString()
  @IsNotEmpty({ message: "Geo Zone name is required" })
  @MaxLength(255)
  name!: string;

  @IsString()
  @IsNotEmpty({ message: "Description is required" })
  @MaxLength(5000)
  description!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GeoZoneLocationDto)
  locations!: GeoZoneLocationDto[];
}

export class UpdateGeoZoneDto {
  @IsString()
  @IsNotEmpty({ message: "Geo Zone name is required" })
  @MaxLength(255)
  @IsOptional()
  name?: string;

  @IsString()
  @IsNotEmpty({ message: "Description is required" })
  @MaxLength(5000)
  @IsOptional()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GeoZoneLocationDto)
  @IsOptional()
  locations?: GeoZoneLocationDto[];
}
