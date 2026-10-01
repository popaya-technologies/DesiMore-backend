import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("store_locations")
export class StoreLocation {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({
    type: "varchar",
    length: 255,
  })
  storeName!: string;

  @Column({
    type: "text",
  })
  address!: string;

  @Column({
    type: "varchar",
    length: 255,
    nullable: true,
  })
  geocode!: string | null;

  @Column({
    type: "varchar",
    length: 100,
  })
  telephone!: string;

  @Column({
    type: "varchar",
    length: 100,
    nullable: true,
  })
  fax!: string | null;

  @Column({
    type: "varchar",
    length: 255,
    nullable: true,
  })
  image!: string | null;

  @Column({
    type: "text",
    nullable: true,
  })
  openingTimes!: string | null;

  @Column({
    type: "text",
    nullable: true,
  })
  comment!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
