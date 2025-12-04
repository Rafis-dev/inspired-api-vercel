import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const DB_PATH = join(process.cwd(), "db.json");
const ORDER_PATH = join(process.cwd(), "order.json");

export default async function handler(req, res) {
  // Обработка CORS для preflight запросов
  if (req.method === "OPTIONS") {
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
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const db = JSON.parse(readFileSync(DB_PATH, "utf-8"));
    let orders = [];

    try {
      orders = JSON.parse(readFileSync(ORDER_PATH, "utf-8"));
    } catch (e) {
      // Если файла нет, создаем пустой массив
      orders = [];
    }

    const data = req.body;

    if (!data.order || !data.order.length) {
      return res.status(400).json({ message: "Order is empty" });
    }

    // Генерируем ID и дату
    data.id = Math.random().toString(10).substring(2, 5);
    data.createdAt = new Date().toGMTString();

    // Считаем общую сумму
    data.totalPrice = data.order.reduce((acc, item) => {
      const product = db.goods.find((product) => item.id === product.id);
      return acc + item.count * product.price;
    }, 0);

    orders.push(data);

    // Сохраняем заказ
    writeFileSync(ORDER_PATH, JSON.stringify(orders, null, 2));

    // Устанавливаем заголовки
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

    res.status(201).json(data);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: error.message,
    });
  }
}
