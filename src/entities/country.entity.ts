import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("countries")
export class Country {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({
    type: "varchar",
    length: 255,
    unique: true,
  })
  name!: string;

  @Column({
    type: "varchar",
    length: 2,
    nullable: true,
  })
  isoCode2!: string | null;

  @Column({
    type: "varchar",
    length: 3,
    nullable: true,
  })
  isoCode3!: string | null;

  @Column({
    type: "text",
    nullable: true,
  })
  addressFormat!: string | null;

  @Column({
    type: "boolean",
    default: false,
  })
  postcodeRequired!: boolean;

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