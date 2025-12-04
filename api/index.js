import { readFileSync, writeFileSync } from "node:fs";
import path from "path";
import * as url from "url";

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

const DB_FILE = path.resolve(__dirname, "../db.json");
const ORDER_FILE = path.resolve(__dirname, "../order.json");

const db = JSON.parse(readFileSync(DB_FILE, "utf-8"));
let orders = JSON.parse(readFileSync(ORDER_FILE, "utf-8"));

async function getJsonBody(req) {
  const buffers = [];
  for await (const chunk of req) buffers.push(chunk);
  const data = Buffer.concat(buffers).toString();
  return JSON.parse(data || "{}");
}

class ApiError extends Error {
  constructor(statusCode, data) {
    super();
    this.statusCode = statusCode;
    this.data = data;
  }
}

function shuffle(array) {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pagination(data, page, count) {
  const end = count * page;
  const start = page === 1 ? 0 : end - count;

  return {
    goods: data.slice(start, end),
    page,
    pages: Math.ceil(data.length / count),
    totalCount: data.length,
  };
}

function createOrder(data) {
  if (!data.order?.length)
    throw new ApiError(500, { message: "Order is empty" });

  data.id = Math.random().toString().substring(2, 8);
  data.createdAt = new Date().toGMTString();

  data.totalPrice = data.order.reduce((acc, item) => {
    const product = db.goods.find((p) => p.id === item.id);
    return acc + item.count * product.price;
  }, 0);

  orders.push(data);
  writeFileSync(ORDER_FILE, JSON.stringify(orders, null, 2));

  return data;
}

function getItems(id) {
  const item = db.goods.find((i) => i.id === id);
  if (!item) throw new ApiError(404, { message: "Item Not Found" });
  return item;
}

function getGoodsList(params) {
  const page = +params.page || 1;
  let count = +params.count || 12;

  let data = [...db.goods];

  if (params.gender) {
    if (params.gender === "all") {
      count = +params.count || 4;
    } else {
      data = data.filter((item) => item.gender === params.gender);
      count = +params.count || 8;
    }

    if (!params.category) {
      data = data.filter((i) => i.top);
      data = shuffle(data);
      if (count < data.length) data.length = count;
      return data;
    }
  }

  if (params.category) {
    if (!params.gender)
      throw new ApiError(403, { message: "Not gender params" });

    if (params.top) {
      data = data.filter(
        (item) =>
          item.top &&
          item.category === params.category &&
          item.id !== params.exclude
      );
      data = shuffle(data);
      if (count < data.length) data.length = count;
    }

    data = data.filter((item) => item.category === params.category);
  }

  if (params.type) data = data.filter((item) => item.type === params.type);

  if (params.search) {
    const s = params.search.replaceAll("+", " ").trim().toLowerCase();
    data = db.goods.filter(
      (item) =>
        item.title.toLowerCase().includes(s) ||
        item.description.toLowerCase().includes(s)
    );
  }

  if (params.list || Object.hasOwn(params, "list")) {
    const list = params.list.trim().toLowerCase();
    data = db.goods.filter((item) => list.includes(item.id)).reverse();
  }

  if (params.count === "all") return data;

  return pagination(data, page, count);
}

export default async function handler(req, res) {
  try {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.status(200).end();
      return;
    }

    const base = `http://${req.headers.host}`;
    const urlObj = new URL(req.url, base);

    // ВАЖНО:
    // /api/index.js → endpoint /api/index
    // значит API начинается с /api/index/...
    const fullPath = urlObj.pathname;
    const apiPath = fullPath.replace("/api/index", "") || "/";

    const search = Object.fromEntries(urlObj.searchParams.entries());

    if (apiPath === "/api/categories") {
      res.status(200).json(db.categories);
      return;
    }

    if (apiPath === "/api/colors") {
      res.status(200).json(db.colors);
      return;
    }

    if (apiPath === "/api/order" && req.method === "POST") {
      const body = await getJsonBody(req);
      const order = createOrder(body);

      res.setHeader("Location", `/api/index/api/order/${order.id}`);
      res.status(201).json(order);
      return;
    }

    if (apiPath === "/api/goods") {
      const list = getGoodsList(search);
      res.status(200).json(list);
      return;
    }

    if (apiPath.startsWith("/api/goods/")) {
      const id = apiPath.replace("/api/goods/", "");
      const item = getItems(id);
      res.status(200).json(item);
      return;
    }

    res.status(404).json({ message: "Not Found" });
  } catch (err) {
    if (err instanceof ApiError) {
      res.status(err.statusCode).json(err.data);
    } else {
      console.error(err);
      res.status(500).json({ message: "Server Error" });
    }
  }
}
