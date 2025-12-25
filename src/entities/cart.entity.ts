import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from "typeorm";
import { User } from "./user.entity";
import { CartItem } from "./cart-item.entity";

export enum CartType {
  REGULAR = "regular",
  BUY_NOW = "buy-now",
}

@Entity("carts")
@Index(["userId", "type"], { unique: true })
export class Cart {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => User, (user) => user.carts, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({ type: "uuid" })
  userId: string;

  @OneToMany(() => CartItem, (cartItem) => cartItem.cart, { cascade: true })
  items: CartItem[];

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  total: number;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  wholesaleTotal: number;

  @Column({ type: "integer", default: 0 })
  itemsCount: number;

  @Column({ type: "varchar", length: 20, default: CartType.REGULAR })
  type: CartType;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  calculateTotal(): void {
    const items = this.items ?? [];
    let total = 0;
    let wholesaleTotal = 0;
    let count = 0;

    for (const item of items) {
      const quantity = item.quantity ?? 0;
      const regularPrice = this.toNumber(item.price);
      const wholesalePrice = this.toNumber(item.product?.wholesalePrice);

      total += regularPrice * quantity;
      wholesaleTotal += wholesalePrice * quantity;
      count += quantity;
    }

    this.total = total;
    this.wholesaleTotal = wholesaleTotal;
    this.itemsCount = count;
  }

  private toNumber(value: unknown): number {
    if (value === null || value === undefined) {
      return 0;
    }

    if (typeof value === "number") {
      return isNaN(value) ? 0 : value;
    }

    if (typeof value === "string") {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }

    return 0;
  }
}
