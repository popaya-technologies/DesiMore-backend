import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
  Index,
} from "typeorm";
import { Product } from "./product.entity";

@Entity("messages")
export class Message {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 100 })
  key: string;

  @Column({ type: "text" })
  message: string;

  @ManyToMany(() => Product, (product) => product.messages)
  @JoinTable({
    name: "message_products",
    joinColumn: {
      name: "messageId",
      referencedColumnName: "id",
    },
    inverseJoinColumn: {
      name: "productId",
      referencedColumnName: "id",
    },
  })
  products: Product[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
