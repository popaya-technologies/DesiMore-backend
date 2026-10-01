import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from "class-validator";

export class CreateStoreDto {
  // General
  @IsString()
  @MaxLength(500)
  metaTitle!: string;

  @IsString()
  @IsOptional()
  metaTagDescription?: string;

  @IsString()
  @IsOptional()
  metaTagKeywords?: string;

  // Store
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  storeOwner!: string;

  @IsString()
  @IsNotEmpty()
  address!: string;

  @IsString()
  @IsOptional()
  geocode?: string;

  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  telephone!: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  fax?: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsString()
  @IsOptional()
  openingTimes?: string;

  @IsString()
  @IsOptional()
  comment?: string;

  // Local
  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  regionState?: string;

  @IsString()
  @IsOptional()
  language?: string;

  @IsString()
  @IsOptional()
  currency?: string;

  // Option - Taxes
  @IsBoolean()
  @IsOptional()
  displayPricesWithTax?: boolean;

  @IsString()
  @IsOptional()
  useStoreTaxAddress?: string;

  @IsString()
  @IsOptional()
  useCustomerTaxAddress?: string;

  // Option - Account
  @IsString()
  @IsOptional()
  customerGroup?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  customerGroups?: string[];

  @IsString()
  @IsOptional()
  accountTerms?: string;

  // Option - Checkout
  @IsBoolean()
  @IsOptional()
  displayWeightOnCartPage?: boolean;

  @IsBoolean()
  @IsOptional()
  guestCheckout?: boolean;

  @IsString()
  @IsOptional()
  checkoutTerms?: string;

  @IsString()
  @IsOptional()
  orderStatus?: string;

  // Option - Stock
  @IsBoolean()
  @IsOptional()
  displayStock?: boolean;

  @IsBoolean()
  @IsOptional()
  stockCheckout?: boolean;

  // Image
  @IsString()
  @IsOptional()
  storeLogo?: string;

  @IsString()
  @IsOptional()
  icon?: string;

  // Server
  @IsString()
  @IsNotEmpty()
  url!: string;

  @IsBoolean()
  @IsOptional()
  useSsl?: boolean;

  // Default Store
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}

export class UpdateStoreDto {
  @IsString()
  @MaxLength(500)
  @IsOptional()
  metaTitle?: string;

  @IsString()
  @IsOptional()
  metaTagDescription?: string;

  @IsString()
  @IsOptional()
  metaTagKeywords?: string;

  @IsString()
  @MaxLength(255)
  @IsOptional()
  name?: string;

  @IsString()
  @MaxLength(255)
  @IsOptional()
  storeOwner?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  geocode?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  telephone?: string;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  fax?: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsString()
  @IsOptional()
  openingTimes?: string;

  @IsString()
  @IsOptional()
  comment?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  regionState?: string;

  @IsString()
  @IsOptional()
  language?: string;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsBoolean()
  @IsOptional()
  displayPricesWithTax?: boolean;

  @IsString()
  @IsOptional()
  useStoreTaxAddress?: string;

  @IsString()
  @IsOptional()
  useCustomerTaxAddress?: string;

  @IsString()
  @IsOptional()
  customerGroup?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  customerGroups?: string[];

  @IsString()
  @IsOptional()
  accountTerms?: string;

  @IsBoolean()
  @IsOptional()
  displayWeightOnCartPage?: boolean;

  @IsBoolean()
  @IsOptional()
  guestCheckout?: boolean;

  @IsString()
  @IsOptional()
  checkoutTerms?: string;

  @IsString()
  @IsOptional()
  orderStatus?: string;

  @IsBoolean()
  @IsOptional()
  displayStock?: boolean;

  @IsBoolean()
  @IsOptional()
  stockCheckout?: boolean;

  @IsString()
  @IsOptional()
  storeLogo?: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsString()
  @IsOptional()
  url?: string;

  @IsBoolean()
  @IsOptional()
  useSsl?: boolean;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
