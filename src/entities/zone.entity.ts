import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

import { Country } from "./country.entity";

@Entity("zones")
export class Zone {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({
    type: "uuid",
  })
  countryId!: string;

  @ManyToOne(() => Country, {
    onDelete: "RESTRICT",
  })
  @JoinColumn({
    name: "countryId",
  })
  country!: Country;

  @Column({
    type: "varchar",
    length: 255,
  })
  name!: string;

  @Column({
    type: "varchar",
    length: 255,
    nullable: true,
  })
  code!: string | null;

  @Column({
    type: "boolean",
    default: true,
  })
  status!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}