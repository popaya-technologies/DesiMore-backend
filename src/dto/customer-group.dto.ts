import { IsString, IsBoolean, Matches, MaxLength, IsInt, Min, Max, ValidateIf } from "class-validator";
const supplied = (_: unknown, value: unknown) => value !== undefined;
export class CreateCustomerGroupDto {
  @ValidateIf(supplied) @IsString() @MaxLength(10000) description?: string;
  @ValidateIf(supplied) @IsBoolean() approveNewCustomers?: boolean;
  @IsString() @Matches(/\S/) @MaxLength(255) name: string;
  @ValidateIf(supplied) @IsInt() @Min(0) @Max(2147483647) sortOrder?: number;
}
export class UpdateCustomerGroupDto {
  @ValidateIf(supplied) @IsString() @MaxLength(10000) description?: string;
  @ValidateIf(supplied) @IsBoolean() approveNewCustomers?: boolean;
  @ValidateIf(supplied) @IsString() @Matches(/\S/) @MaxLength(255) name?: string;
  @ValidateIf(supplied) @IsInt() @Min(0) @Max(2147483647) sortOrder?: number;
}
