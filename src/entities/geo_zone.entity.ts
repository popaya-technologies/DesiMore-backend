import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { GeoZoneLocation } from "./geo_zone_location.entity";

@Entity("geo_zones")
export class GeoZone {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({
    type: "varchar",
    length: 255,
    unique: true,
  })
  name!: string;

  @Column({
    type: "text",
  })
  description!: string;

  @OneToMany(
    () => GeoZoneLocation,
    (location) => location.geoZone,
    {
      cascade: true,
    }
  )
  locations!: GeoZoneLocation[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}