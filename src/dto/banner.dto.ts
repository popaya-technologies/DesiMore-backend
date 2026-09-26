import { Type } from "class-transformer";
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsInt, IsString, Matches, Max, MaxLength, Min, ValidateIf, ValidateNested } from "class-validator";

const supplied = (_: unknown, value: unknown) => value !== undefined;
export class BannerSlideDto {
  @ValidateIf(supplied) @IsString() @MaxLength(255) title?: string;
  @ValidateIf(supplied) @IsString() @MaxLength(2048) link?: string;
  @IsString() @Matches(/\S/) @MaxLength(2048) image: string;
  @ValidateIf(supplied) @IsInt() @Min(0) @Max(2147483647) sortOrder?: number;
}
export class CreateBannerDto {
  @IsString() @Matches(/\S/) @MaxLength(255) name: string;
  @ValidateIf(supplied) @IsBoolean() isActive?: boolean;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(100)
  @ValidateNested({ each: true }) @Type(() => BannerSlideDto) slides: BannerSlideDto[];
}
export class UpdateBannerDto {
  @ValidateIf(supplied) @IsString() @Matches(/\S/) @MaxLength(255) name?: string;
  @ValidateIf(supplied) @IsBoolean() isActive?: boolean;
  @ValidateIf(supplied) @IsArray() @ArrayMinSize(1) @ArrayMaxSize(100)
  @ValidateNested({ each: true }) @Type(() => BannerSlideDto) slides?: BannerSlideDto[];
}
