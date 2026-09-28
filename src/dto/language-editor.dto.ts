import { IsString, Matches, MaxLength, ValidateIf, IsArray, ArrayMinSize, ArrayMaxSize, ArrayUnique, IsUUID } from "class-validator";
const supplied = (_: unknown, value: unknown) => value !== undefined;
export class CreateTranslationDto {
  @ValidateIf(supplied) @IsString() @Matches(/\S/) @MaxLength(100) store?: string;
  @ValidateIf(supplied) @IsString() @Matches(/\S/) @MaxLength(50) language?: string;
  @IsString() @Matches(/\S/) @MaxLength(255) route: string;
  @IsString() @Matches(/\S/) @MaxLength(255) key: string;
  @IsString() @MaxLength(20000) value: string;
}
export class UpdateTranslationDto {
  @ValidateIf(supplied) @IsString() @Matches(/\S/) @MaxLength(100) store?: string;
  @ValidateIf(supplied) @IsString() @Matches(/\S/) @MaxLength(50) language?: string;
  @ValidateIf(supplied) @IsString() @Matches(/\S/) @MaxLength(255) route?: string;
  @ValidateIf(supplied) @IsString() @Matches(/\S/) @MaxLength(255) key?: string;
  @ValidateIf(supplied) @IsString() @MaxLength(20000) value?: string;
}
export class DeleteTranslationsDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(100) @ArrayUnique()
  @IsUUID(undefined, { each: true }) ids: string[];
}
