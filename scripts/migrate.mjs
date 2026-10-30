import { readFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);
const schema = await readFile(new URL("../db/schema.sql", import.meta.url), "utf8");
await sql.transaction(schema.split(";").filter(s => s.trim()).map(s => sql.query(s)));
console.log("Portal schema ready.");
