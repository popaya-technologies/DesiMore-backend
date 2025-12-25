import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Wishlist } from "./wishlist.entity";
import { Product } from "./product.entity";

@Entity("wishlist_items")
export class WishlistItem {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Wishlist, (wishlist) => wishlist.items, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "wishlistId" })
  wishlist: Wishlist;

  @Column({ type: "uuid" })
  wishlistId: string;

  @ManyToOne(() => Product, { eager: true })
  @JoinColumn({ name: "productId" })
  product: Product;

  @Column({ type: "uuid" })
  productId: string;

  @CreateDateColumn()
  createdAt: Date;
}

