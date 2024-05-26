import "dotenv/config";
import connection, { db } from "../db.js";
import { migrate } from "drizzle-orm/node-postgres/migrator";

await migrate(db, { migrationsFolder: "./drizzle" });

await connection.end();
