import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("currencies")
export class Currency {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 255 })
  currencyTitle!: string;

  @Column({ type: "varchar", length: 50 })
  code!: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  symbolLeft!: string | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  symbolRight!: string | null;

  @Column({ type: "integer", default: 2 })
  decimalPlaces!: number;

  @Column({
    type: "numeric",
    precision: 20,
    scale: 8,
    default: 1,
  })
  value!: number;

  @Column({ type: "boolean", default: true })
  status!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
