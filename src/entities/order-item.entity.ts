import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from "typeorm";
import { Order } from "./order.entity";
import { Product } from "./product.entity";

@Entity("order_items")
export class OrderItem {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: "CASCADE" })
  order: Order;

  @Column({ type: "uuid" })
  orderId: string;

  @ManyToOne(() => Product)
  product: Product;

  @Column({ type: "uuid" })
  productId: string;

  @Column({ type: "varchar" })
  productName: string;

  @Column({ type: "text", array: true })
  productImages: string[];

  @Column({ type: "integer" })
  quantity: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  price: number;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  discountedPrice: number | null;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  total: number;

  @CreateDateColumn()
  createdAt: Date;

  // Calculate item total
  calculateTotal(): void {
    const actualPrice = this.discountedPrice || this.price;
    // Ensure both values are numbers before calculation
    const price =
      typeof actualPrice === "string" ? parseFloat(actualPrice) : actualPrice;
    const qty =
      typeof this.quantity === "string"
        ? parseInt(this.quantity)
        : this.quantity;

    console.log(
      `OrderItem calculateTotal - price: ${price}, qty: ${qty}, actualPrice: ${actualPrice}, discountedPrice: ${this.discountedPrice}, originalPrice: ${this.price}`
    );

    this.total = price * qty;
    console.log(`OrderItem total calculated: ${this.total}`);
  }
}
