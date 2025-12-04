import { readFileSync } from "node:fs";
import path from "path";
import * as url from "url";

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));
const DB_FILE = path.resolve(__dirname, "../db.json");
const db = JSON.parse(readFileSync(DB_FILE, "utf-8"));

export default function handler(req, res) {
  res.status(200).json(db.colors);
}
