import {
  IsUUID,
  IsNumber,
  Min,
  IsArray,
  ValidateNested,
  IsOptional,
} from "class-validator";

export class AddToCartDto {
  @IsUUID()
  productId: string;

  @IsNumber()
  @Min(1)
  quantity: number;
}

export class UpdateCartItemDto {
  @IsNumber()
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
