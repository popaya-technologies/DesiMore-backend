import { IsUUID } from "class-validator";

export class AddToWishlistDto {
  @IsUUID()
  productId: string;
}

export class WishlistResponseDto {
  id: string;
  userId: string;
  items: WishlistItemResponseDto[];
  createdAt: Date;
  updatedAt: Date;
}

export class WishlistItemResponseDto {
  id: string;
  productId: string;
  product: {
    id: string;
    title: string;
    images: string[];
    price: number;
  };
  createdAt: Date;
}

