import { readFileSync } from "node:fs";
import path from "path";
import * as url from "url";

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));
const DB_FILE = path.resolve(__dirname, "../db.json");
const db = JSON.parse(readFileSync(DB_FILE, "utf-8"));

export default function handler(req, res) {
  const urlObj = new URL(req.url, `http://${req.headers.host}`);
  const id = urlObj.searchParams.get("id");

  const item = db.goods.find((i) => i.id === id);

  if (!item) {
    res.status(404).json({ message: "Not found" });
    return;
  }

  res.status(200).json(item);
}
