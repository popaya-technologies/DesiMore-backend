import { IsString, IsUUID, IsInt, Matches, MaxLength, Min, Max, ValidateIf } from "class-validator";
const supplied = (_: unknown, value: unknown) => value !== undefined;
export class CreateAttributeDto {
  @IsString() @Matches(/\S/) @MaxLength(255) name: string;
  @ValidateIf(supplied) @IsUUID() attributeGroupId?: string;
  @ValidateIf(supplied) @IsInt() @Min(0) @Max(2147483647) sortOrder?: number;
}
export class UpdateAttributeDto {
  @ValidateIf(supplied) @IsString() @Matches(/\S/) @MaxLength(255) name?: string;
  @ValidateIf(supplied) @IsUUID() attributeGroupId?: string;
  @ValidateIf(supplied) @IsInt() @Min(0) @Max(2147483647) sortOrder?: number;
}
