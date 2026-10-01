import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("stores")
export class Store {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  // General
  @Column({
    type: "text",
    default: "",
  })
  metaTitle!: string;

  @Column({
    type: "text",
    default: "",
  })
  metaTagDescription!: string;

  @Column({
    type: "text",
    default: "",
  })
  metaTagKeywords!: string;

  // Store / List
  @Column({
    type: "varchar",
    length: 255,
  })
  name!: string;

  @Column({
    type: "text",
  })
  storeOwner!: string;

  @Column({
    type: "text",
  })
  address!: string;

  @Column({
    type: "text",
    default: "",
  })
  geocode!: string;

  @Column({
    type: "varchar",
    length: 255,
  })
  email!: string;

  @Column({
    type: "varchar",
    length: 100,
  })
  telephone!: string;

  @Column({
    type: "varchar",
    length: 100,
    default: "",
  })
  fax!: string;

  @Column({
    type: "text",
    default: "",
  })
  image!: string;

  @Column({
    type: "text",
    default: "",
  })
  openingTimes!: string;

  @Column({
    type: "text",
    default: "",
  })
  comment!: string;

  // Local
  @Column({
    type: "varchar",
    length: 100,
    default: "United States",
  })
  country!: string;

  @Column({
    type: "varchar",
    length: 150,
    default: "New Jersey",
  })
  regionState!: string;

  @Column({
    type: "varchar",
    length: 100,
    default: "English",
  })
  language!: string;

  @Column({
    type: "varchar",
    length: 100,
    default: "US Dollar",
  })
  currency!: string;

  // Option - Taxes
  @Column({
    type: "boolean",
    default: false,
  })
  displayPricesWithTax!: boolean;

  @Column({
    type: "text",
    default: "",
  })
  useStoreTaxAddress!: string;

  @Column({
    type: "text",
    default: "",
  })
  useCustomerTaxAddress!: string;

  // Option - Account
  @Column({
    type: "varchar",
    length: 150,
    default: "Default",
  })
  customerGroup!: string;

  @Column({
    type: "text",
    array: true,
    default: () => "ARRAY[]::text[]",
  })
  customerGroups!: string[];

  @Column({
    type: "text",
    default: "",
  })
  accountTerms!: string;

  // Option - Checkout
  @Column({
    type: "boolean",
    default: false,
  })
  displayWeightOnCartPage!: boolean;

  @Column({
    type: "boolean",
    default: false,
  })
  guestCheckout!: boolean;

  @Column({
    type: "text",
    default: "",
  })
  checkoutTerms!: string;

  @Column({
    type: "varchar",
    length: 100,
    default: "Canceled",
  })
  orderStatus!: string;

  // Option - Stock
  @Column({
    type: "boolean",
    default: false,
  })
  displayStock!: boolean;

  @Column({
    type: "boolean",
    default: false,
  })
  stockCheckout!: boolean;

  // Image
  @Column({
    type: "text",
    default: "",
  })
  storeLogo!: string;

  @Column({
    type: "text",
    default: "",
  })
  icon!: string;

  // Server
  @Column({
    type: "text",
  })
  url!: string;

  @Column({
    type: "boolean",
    default: false,
  })
  useSsl!: boolean;

  // Default Store
  @Column({
    type: "boolean",
    default: false,
  })
  isDefault!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
