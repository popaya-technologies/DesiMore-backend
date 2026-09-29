import { Type } from "class-transformer";
import { IsString, Matches, MaxLength, IsInt, Min, Max, ValidateIf, IsUUID, IsArray, ArrayMinSize, ArrayMaxSize, ValidateNested } from "class-validator";
const supplied = (_: unknown, value: unknown) => value !== undefined;
export class FilterValueDto {
  @ValidateIf(supplied) @IsUUID() id?: string;
  @IsString() @Matches(/\S/) @MaxLength(255) name: string;
  @ValidateIf(supplied) @IsInt() @Min(0) @Max(2147483647) sortOrder?: number;
}
export class CreateFilterDto {
  @IsString() @Matches(/\S/) @MaxLength(255) name: string;
  @ValidateIf(supplied) @IsInt() @Min(0) @Max(2147483647) sortOrder?: number;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(100)
  @ValidateNested({ each: true }) @Type(() => FilterValueDto) values: FilterValueDto[];
}
export class UpdateFilterDto {
  @ValidateIf(supplied) @IsString() @Matches(/\S/) @MaxLength(255) name?: string;
  @ValidateIf(supplied) @IsInt() @Min(0) @Max(2147483647) sortOrder?: number;
  @ValidateIf(supplied) @IsArray() @ArrayMinSize(1) @ArrayMaxSize(100)
  @ValidateNested({ each: true }) @Type(() => FilterValueDto) values?: FilterValueDto[];
}
