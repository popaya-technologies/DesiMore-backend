import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from "class-validator";

// An empty string clears the code; otherwise letters, numbers and dashes only (e.g. "CA", "MH", "AU-NSW").
const ZONE_CODE_PATTERN = /^([A-Za-z0-9-]{1,32})?$/;
const ZONE_CODE_MESSAGE =
  "Zone code can contain only letters, numbers and dashes (max 32)";

export class CreateZoneDto {
  @IsUUID("all", { message: "Please select a country" })
  countryId!: string;

  @IsString()
  @IsNotEmpty({ message: "Zone name is required" })
  @MaxLength(255)
  name!: string;

  @IsString()
  @IsOptional()
  @Matches(ZONE_CODE_PATTERN, { message: ZONE_CODE_MESSAGE })
  code?: string;

  @IsBoolean()
  status!: boolean;
}

export class UpdateZoneDto {
  @IsUUID("all", { message: "Please select a country" })
  @IsOptional()
  countryId?: string;

  @IsString()
  @IsNotEmpty({ message: "Zone name is required" })
  @MaxLength(255)
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  @Matches(ZONE_CODE_PATTERN, { message: ZONE_CODE_MESSAGE })
  code?: string;

  @IsBoolean()
  @IsOptional()
  status?: boolean;
}
