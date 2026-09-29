import { Type } from "class-transformer";
import { IsString, Matches, MaxLength, IsInt, Min, Max, ValidateIf, IsIn, IsUUID, IsArray, ArrayMaxSize, ValidateNested } from "class-validator";
export const CATALOG_OPTION_TYPES = ["select", "radio", "checkbox", "text", "textarea", "date", "time", "datetime"];
const supplied = (_: unknown, value: unknown) => value !== undefined;
export class CatalogOptionValueDto {
  @ValidateIf(supplied) @IsUUID() id?: string;
  @IsString() @Matches(/\S/) @MaxLength(255) name: string;
  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsString() @MaxLength(2048) image?: string | null;
  @ValidateIf(supplied) @IsInt() @Min(0) @Max(2147483647) sortOrder?: number;
}
export class CreateOptionDto {
  @IsString() @Matches(/\S/) @MaxLength(255) name: string;
  @ValidateIf(supplied) @IsIn(CATALOG_OPTION_TYPES) type?: string;
  @ValidateIf(supplied) @IsInt() @Min(0) @Max(2147483647) sortOrder?: number;
  @ValidateIf(supplied) @IsArray() @ArrayMaxSize(100)
  @ValidateNested({ each: true }) @Type(() => CatalogOptionValueDto) values?: CatalogOptionValueDto[];
}
export class UpdateOptionDto {
  @ValidateIf(supplied) @IsString() @Matches(/\S/) @MaxLength(255) name?: string;
  @ValidateIf(supplied) @IsIn(CATALOG_OPTION_TYPES) type?: string;
  @ValidateIf(supplied) @IsInt() @Min(0) @Max(2147483647) sortOrder?: number;
  @ValidateIf(supplied) @IsArray() @ArrayMaxSize(100)
  @ValidateNested({ each: true }) @Type(() => CatalogOptionValueDto) values?: CatalogOptionValueDto[];
}
