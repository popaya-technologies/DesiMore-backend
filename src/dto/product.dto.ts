import {
  IsString,
  IsBoolean,
  IsArray,
  IsNumber,
  IsInt,
  IsUUID,
  IsIn,
  Min,
  Max,
  MaxLength,
  ArrayMaxSize,
  ArrayUnique,
  ValidateNested,
  ValidateIf,
  Matches,
  IsDateString,
} from "class-validator";
import { Type, Transform } from "class-transformer";
export const LENGTH_CLASSES = ["inch", "centimeter", "millimeter"];
export const WEIGHT_CLASSES = ["pound", "kilogram", "gram", "ounce"];
export const STOCK_STATUSES = [
  "out_of_stock",
  "in_stock",
  "pre_order",
  "2_3_days",
];
export const OPTION_TYPES = [
  "checkbox",
  "select",
  "radio",
  "text",
  "textarea",
  "date",
  "time",
  "datetime",
];
export const CUSTOMER_GROUPS = ["default", "wholesaler"];
const optional = (_: unknown, value: unknown) => value !== undefined;
const nullable = (_: unknown, value: unknown) =>
  value !== undefined && value !== null;
export class AttributeDto {
  @ValidateIf(optional) @IsUUID() id?: string;
  @IsString() @MaxLength(255) @Matches(/\S/) name: string;
  @IsString() @MaxLength(50000) text: string;
  @ValidateIf(optional) @IsInt() @Min(0) sortOrder?: number;
}
export class OptionValueDto {
  @ValidateIf(optional) @IsUUID() id?: string;
  @IsString() @MaxLength(255) @Matches(/\S/) value: string;
  @IsInt() @Min(0) @Max(2147483647) quantity: number;
  @ValidateIf(optional) @IsBoolean() subtractStock?: boolean;
  @ValidateIf(optional) @IsIn(["+", "-"]) pricePrefix?: "+" | "-";
  @ValidateIf(optional)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999.99)
  price?: number;
  @ValidateIf(optional) @IsIn(["+", "-"]) pointsPrefix?: "+" | "-";
  @ValidateIf(optional) @IsInt() @Min(0) @Max(2147483647) points?: number;
  @ValidateIf(optional) @IsIn(["+", "-"]) weightPrefix?: "+" | "-";
  @ValidateIf(optional)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999.99)
  weight?: number;
}
export class OptionDto {
  @ValidateIf(optional) @IsUUID() id?: string;
  @IsString() @MaxLength(255) @Matches(/\S/) name: string;
  @IsIn(OPTION_TYPES) type: string;
  @IsBoolean() required: boolean;
  @ValidateIf(optional) @IsInt() @Min(0) sortOrder?: number;
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => OptionValueDto)
  values: OptionValueDto[];
}
export class DiscountDto {
  @ValidateIf(optional) @IsUUID() id?: string;
  @IsIn(CUSTOMER_GROUPS) customerGroup: string;
  @IsInt() @Min(1) @Max(2147483647) quantity: number;
  @IsInt() @Min(0) priority: number;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(99999999.99) price: number;
  @ValidateIf(nullable)
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dateStart?: string | null;
  @ValidateIf(nullable)
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dateEnd?: string | null;
}
export class ProductImageDto {
  @ValidateIf(optional) @IsUUID() id?: string;
  @IsString() @MaxLength(2048) url: string;
  @IsBoolean() isMain: boolean;
  @IsInt() @Min(0) sortOrder: number;
}
export class DownloadDto {
  @IsString() @Matches(/\S/) @MaxLength(255) name: string;
  @IsString() @MaxLength(2048) url: string;
}
export class PackageDimensionsDto {
  @ValidateIf(nullable) @IsNumber() @Min(0) length?: number;
  @ValidateIf(nullable) @IsNumber() @Min(0) width?: number;
  @ValidateIf(nullable) @IsNumber() @Min(0) height?: number;
}
export class CreateProductDto {
  @ValidateIf(optional)
  @IsString()
  @Matches(/\S/)
  @MaxLength(255)
  title?: string;
  @ValidateIf(optional)
  @IsString()
  @Matches(/\S/)
  @MaxLength(255)
  model?: string;
  @ValidateIf(optional)
  @IsString()
  @Matches(/\S/)
  @MaxLength(255)
  metaTitle?: string;
  @ValidateIf(optional) @IsString() @MaxLength(100000) summary?: string;
  @ValidateIf(nullable) @IsString() @MaxLength(100) sku?: string | null;
  @ValidateIf(nullable) @IsString() @MaxLength(100) mpn?: string | null;
  @ValidateIf(nullable) @IsString() @MaxLength(255) metaDescription?:
    string | null;
  @ValidateIf(nullable) @IsString() @MaxLength(255) metaKeyword?: string | null;
  @ValidateIf(nullable) @IsString() @MaxLength(2000) tag?: string | null;
  @ValidateIf(optional)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999.99)
  price?: number;
  @ValidateIf(nullable)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999.99)
  discountPrice?: number | null;
  @ValidateIf(optional)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999.99)
  wholesalePrice?: number;
  @ValidateIf(nullable)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999.99)
  weight?: number | null;
  @ValidateIf(nullable)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999.99)
  length?: number | null;
  @ValidateIf(nullable)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999.99)
  width?: number | null;
  @ValidateIf(nullable)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999.99)
  height?: number | null;
  @ValidateIf(nullable)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999.99)
  wholesaleWeight?: number | null;
  @ValidateIf(nullable)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999.99)
  wholesaleLength?: number | null;
  @ValidateIf(nullable)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999.99)
  wholesaleWidth?: number | null;
  @ValidateIf(nullable)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999.99)
  wholesaleHeight?: number | null;
  @ValidateIf(optional)
  @Transform(({ value }) => (typeof value === "number" ? String(value) : value))
  @IsString()
  @Matches(/^\d{1,9}$/)
  quantity?: string;
  @ValidateIf(nullable) @IsInt() @Min(1) @Max(2147483647) unitsPerCarton?:
    number | null;
  @ValidateIf(nullable)
  @Transform(({ value }) => (typeof value === "number" ? String(value) : value))
  @IsString()
  @Matches(/^[1-9]\d{0,8}$/)
  wholesaleOrderQuantity?: string | null;
  @ValidateIf(optional)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  minimumQuantity?: number;
  @ValidateIf(optional)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  wholesaleMinimumQuantity?: number;
  @ValidateIf(optional) @IsInt() @Min(0) @Max(2147483647) sortOrder?: number;
  @ValidateIf(optional)
  @IsInt()
  @Min(0)
  @Max(2147483647)
  wholesaleQuantity?: number;
  @ValidateIf(optional) @IsBoolean() inStock?: boolean;
  @ValidateIf(optional) @IsBoolean() isActive?: boolean;
  @ValidateIf(optional) @IsBoolean() subtractStock?: boolean;
  @ValidateIf(optional) @IsBoolean() requiresShipping?: boolean;
  @ValidateIf(optional) @IsBoolean() wholesaleRequiresShipping?: boolean;
  @ValidateIf(nullable)
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dateAvailable?: string | null;
  @ValidateIf(nullable)
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  wholesaleDateAvailable?: string | null;
  @ValidateIf(optional) @IsIn(LENGTH_CLASSES) lengthClass?: string;
  @ValidateIf(optional) @IsIn(LENGTH_CLASSES) wholesaleLengthClass?: string;
  @ValidateIf(optional) @IsIn(WEIGHT_CLASSES) weightClass?: string;
  @ValidateIf(optional) @IsIn(WEIGHT_CLASSES) wholesaleWeightClass?: string;
  @ValidateIf(optional) @IsIn(STOCK_STATUSES) outOfStockStatus?: string;
  @ValidateIf(nullable) @IsUUID() brandId?: string | null;
  @ValidateIf(optional)
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(100)
  @IsUUID(undefined, { each: true })
  categoryIds?: string[];
  @ValidateIf(optional)
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(100)
  @IsUUID(undefined, { each: true })
  relatedProductIds?: string[];
  @ValidateIf(optional)
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(100)
  @IsUUID(undefined, { each: true })
  downloadIds?: string[];
  @ValidateIf(optional)
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  images?: string[];
  @ValidateIf(optional)
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => AttributeDto)
  attributes?: AttributeDto[];
  @ValidateIf(optional)
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => OptionDto)
  options?: OptionDto[];
  @ValidateIf(optional)
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => DiscountDto)
  discounts?: DiscountDto[];
  @ValidateIf(optional)
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ProductImageDto)
  imageDetails?: ProductImageDto[];
  @ValidateIf(nullable)
  @ValidateNested()
  @Type(() => PackageDimensionsDto)
  package?: PackageDimensionsDto | null;
}
export class UpdateProductDto extends CreateProductDto {}
