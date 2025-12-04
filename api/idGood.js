import { readFileSync } from "fs";
import { join } from "path";

const DB_PATH = join(process.cwd(), "db.json");

export default function handler(req, res) {
  try {
    const db = JSON.parse(readFileSync(DB_PATH, "utf-8"));
    const { id } = req.query;

    const item = db.goods.find((product) => product.id === id);

    if (!item) {
      return res.status(404).json({ message: "Item Not Found" });
    }

    // CORS заголовки
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET,OPTIONS,PATCH,DELETE,POST,PUT"
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
    );

    res.status(200).json(item);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: error.message,
    });
  }
}
