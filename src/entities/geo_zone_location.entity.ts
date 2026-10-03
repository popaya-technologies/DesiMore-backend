import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { GeoZone } from "./geo_zone.entity";
import { Country } from "./country.entity";
import { Zone } from "./zone.entity";

@Entity("geo_zone_locations")
export class GeoZoneLocation {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  geoZoneId!: string;

  @ManyToOne(() => GeoZone, (geoZone) => geoZone.locations, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "geoZoneId" })
  geoZone!: GeoZone;

  @Column({ type: "uuid" })
  countryId!: string;

  @ManyToOne(() => Country, {
    onDelete: "RESTRICT",
  })
  @JoinColumn({ name: "countryId" })
  country!: Country;

  @Column({ type: "uuid", nullable: true })
  zoneId!: string | null;

  @ManyToOne(() => Zone, {
    onDelete: "RESTRICT",
    nullable: true,
  })
  @JoinColumn({ name: "zoneId" })
  zone!: Zone | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}