import { ValidateIf, IsNumber, Min, Max, IsString, Matches, MaxLength, IsArray, ArrayMinSize, ArrayMaxSize, ArrayUnique, IsUUID } from "class-validator";

export class CreateLengthClassDto {
  @IsString() @Matches(/\S/) @MaxLength(100) lengthTitle: string;
  @IsString() @Matches(/\S/) @MaxLength(32) lengthUnit: string;
  @ValidateIf((_object, value) => value !== undefined)
  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 8 })
  @Min(0.00000001) @Max(999999999999) value?: number;
}
export class UpdateLengthClassDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsString() @Matches(/\S/) @MaxLength(100) lengthTitle?: string;
  @ValidateIf((_object, value) => value !== undefined)
  @IsString() @Matches(/\S/) @MaxLength(32) lengthUnit?: string;
  @ValidateIf((_object, value) => value !== undefined)
  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 8 })
  @Min(0.00000001) @Max(999999999999) value?: number;
}
export class BulkDeleteLengthClassDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(100)
  @ArrayUnique((id: unknown) => typeof id === "string" ? id.toLowerCase() : id)
  @IsUUID("all", { each: true }) ids: string[];
}
