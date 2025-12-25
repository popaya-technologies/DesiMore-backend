// server.ts
import app from "./app";
import { AppDataSource } from "./data-source";
import * as dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT || 3000;

// Initialize database and start server
AppDataSource.initialize()
  .then(() => {
    console.log("Database connected");
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Database connection failed", error);
  });
