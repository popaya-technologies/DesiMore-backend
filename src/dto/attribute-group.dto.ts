import { IsString, Matches, MaxLength, IsInt, Min, Max, ValidateIf } from "class-validator";
const supplied = (_: unknown, value: unknown) => value !== undefined;
export class CreateAttributeGroupDto {
  @IsString() @Matches(/\S/) @MaxLength(255) name: string;
  @ValidateIf(supplied) @IsInt() @Min(0) @Max(2147483647) sortOrder?: number;
}
export class UpdateAttributeGroupDto {
  @ValidateIf(supplied) @IsString() @Matches(/\S/) @MaxLength(255) name?: string;
  @ValidateIf(supplied) @IsInt() @Min(0) @Max(2147483647) sortOrder?: number;
}
