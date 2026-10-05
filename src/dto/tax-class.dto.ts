import { Type } from "class-transformer";
import { IsString, Matches, MaxLength, ValidateIf, IsArray, ArrayMaxSize, ArrayMinSize, ArrayUnique, IsUUID, ValidateNested, IsIn, IsInt, Min, Max, IsNumber } from "class-validator";
const supplied = (_: unknown, value: unknown) => value !== undefined;
export class TaxRuleDto {
  @IsUUID() taxRateId: string;
  @ValidateIf(supplied) @IsIn(["shipping", "payment", "store"]) basedOn?: string;
  @ValidateIf(supplied) @IsInt() @Min(0) @Max(2147483647) priority?: number;
}
export class CreateTaxClassDto {
  @IsString() @Matches(/\S/) @MaxLength(255) title: string;
  @IsString() @Matches(/\S/) @MaxLength(10000) description: string;
  @ValidateIf(supplied) @IsArray() @ArrayMaxSize(100) @ValidateNested({ each: true }) @Type(() => TaxRuleDto) rules?: TaxRuleDto[];
}
export class UpdateTaxClassDto {
  @ValidateIf(supplied) @IsString() @Matches(/\S/) @MaxLength(255) title?: string;
  @ValidateIf(supplied) @IsString() @Matches(/\S/) @MaxLength(10000) description?: string;
  @ValidateIf(supplied) @IsArray() @ArrayMaxSize(100) @ValidateNested({ each: true }) @Type(() => TaxRuleDto) rules?: TaxRuleDto[];
}
export class BulkDeleteTaxClassDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(100)
  @ArrayUnique((id: unknown) => typeof id === "string" ? id.toLowerCase() : id)
  @IsUUID("all", { each: true }) ids: string[];
}
export class CreateTaxRateDto {
  @IsString() @Matches(/\S/) @MaxLength(255) name: string;
  @IsNumber({ maxDecimalPlaces: 4 }) @Min(0) @Max(99999999.9999) rate: number;
  @ValidateIf(supplied) @IsIn(["percentage", "fixed"]) type?: string;
}
