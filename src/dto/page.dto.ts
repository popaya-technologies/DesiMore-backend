import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsString, Matches, Max, MaxLength, Min, ValidateIf } from "class-validator";
import { PAGE_PLACEMENTS } from "../entities/page.entity";
const supplied = (_: unknown, value: unknown) => value !== undefined;
export class UpdatePageDto {
  @ValidateIf(supplied) @IsString() @Matches(/\S/) @MaxLength(255) title?: string;
  @ValidateIf(supplied) @IsString() @MaxLength(1000000) description?: string;
  @ValidateIf(supplied) @IsArray() @ArrayMaxSize(100) @IsString({ each: true }) @MaxLength(2048, { each: true }) media?: string[];
  @ValidateIf(supplied) @IsString() @MaxLength(255) metaTagTitle?: string;
  @ValidateIf(supplied) @IsString() @MaxLength(5000) metaTagDescription?: string;
  @ValidateIf(supplied) @IsString() @MaxLength(5000) metaTagKeywords?: string;
  @ValidateIf(supplied) @IsIn(PAGE_PLACEMENTS) bottom?: string;
  @ValidateIf(supplied) @IsInt() @Min(0) @Max(2147483647) sortOrder?: number;
  @ValidateIf(supplied) @IsBoolean() isActive?: boolean;
  @ValidateIf(supplied) @IsString() @MaxLength(255) @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) slug?: string;
}
