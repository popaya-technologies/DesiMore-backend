import {
  IsUUID,
  IsNumber,
  Min,
  IsArray,
  ValidateNested,
  IsOptional,
  IsInt,
  ArrayMaxSize,
} from "class-validator";
import { Type } from "class-transformer";
import { SelectedOptionDto } from "./selected-option.dto";

export class AddToCartDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => SelectedOptionDto)
  selectedOptions?: SelectedOptionDto[];
  @IsUUID()
  productId: string;

  @IsInt()
  @Min(1)
  quantity: number;
}

export class UpdateCartItemDto {
  @IsInt()
  @Min(0) // Allow 0 to remove item
  quantity: number;
}

export class CartResponseDto {
  id: string;
  userId: string;
  total: number;
  itemsCount: number;
  items: CartItemResponseDto[];
  createdAt: Date;
  updatedAt: Date;
}

export class CartItemResponseDto {
  id: string;
  productId: string;
  product: {
    id: string;
    title: string;
    images: string[];
    price: number;
  };
  quantity: number;
  price: number;
  total: number;
  createdAt: Date;
}
