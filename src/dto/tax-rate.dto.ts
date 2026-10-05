import { IsString, Matches, MaxLength, IsNumber, Min, Max, IsIn, ValidateIf, IsUUID, IsArray, ArrayMaxSize, ArrayMinSize, ArrayUnique } from "class-validator";
const supplied = (_: unknown, v: unknown) => v !== undefined;
export class UpdateTaxRateDto {
  @ValidateIf(supplied) @IsString() @Matches(/\S/) @MaxLength(255) name?: string;
  @ValidateIf(supplied) @IsNumber({ maxDecimalPlaces: 4 }) @Min(0) @Max(99999999.9999) rate?: number;
  @ValidateIf(supplied) @IsIn(["percentage", "fixed"]) type?: string;
  @ValidateIf((_o, v) => v !== undefined && v !== null) @IsUUID() geoZoneId?: string | null;
  @ValidateIf(supplied) @IsArray() @ArrayMaxSize(100)
  @ArrayUnique((id: unknown) => typeof id === "string" ? id.toLowerCase() : id)
  @IsUUID("all", { each: true }) customerGroupIds?: string[];
}
export class CreateTaxRateDto extends UpdateTaxRateDto {}
export class BulkDeleteTaxRateDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(100)
  @ArrayUnique((id: unknown) => typeof id === "string" ? id.toLowerCase() : id)
  @IsUUID("all", { each: true }) ids: string[];
}
