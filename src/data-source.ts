import "reflect-metadata";
import { DataSource } from "typeorm";
import * as dotenv from "dotenv";

dotenv.config();

const isProduction = process.env.NODE_ENV === "production";

export const AppDataSource = new DataSource({
  type: "postgres",

  ...(process.env.DATABASE_URL
    ? {
        url: process.env.DATABASE_URL,
      }
    : {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || "5432"),
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      }),

  ssl: isProduction
    ? {
        rejectUnauthorized: false,
      }
    : false,

  synchronize: false,
  logging: ["error"],

  entities: [isProduction ? "dist/entities/**/*.js" : "src/entities/**/*.ts"],

  migrations: [
    isProduction ? "dist/migrations/**/*.js" : "src/migrations/**/*.ts",
  ],

  subscribers: [],
});
