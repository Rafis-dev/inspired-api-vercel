import { readFileSync, writeFileSync } from "node:fs";
import path from "path";
import * as url from "url";

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));
const ORDER_FILE = path.resolve(__dirname, "../order.json");
const DB_FILE = path.resolve(__dirname, "../db.json");

const db = JSON.parse(readFileSync(DB_FILE, "utf-8"));
let orders = JSON.parse(readFileSync(ORDER_FILE, "utf-8"));

async function getBody(req) {
  const buffers = [];
  for await (const chunk of req) buffers.push(chunk);
  return JSON.parse(Buffer.concat(buffers).toString() || "{}");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  const data = await getBody(req);

  if (!data.order?.length) {
    res.status(400).json({ message: "Order empty" });
    return;
  }

  data.id = Math.random().toString().substring(2, 8);
  data.createdAt = new Date().toGMTString();

  data.totalPrice = data.order.reduce((acc, item) => {
    const product = db.goods.find((p) => p.id === item.id);
    return acc + item.count * product.price;
  }, 0);

  orders.push(data);
  writeFileSync(ORDER_FILE, JSON.stringify(orders, null, 2));

  res.status(201).json(data);
}
