import { log } from "node:console";
import { readFileSync, readFile, writeFile } from "node:fs";
import { createServer } from "node:http";
import path from "path";
import * as url from "url";
const __dirname = url.fileURLToPath(new URL(".", import.meta.url));
const DB_FILE = path.resolve(__dirname, "db.json");
const ORDER_FILE = path.resolve(__dirname, "order.json");
const PORT = process.env.PORT || 8024;
const URI_PREFIX = "/api/goods";

const db = JSON.parse(readFileSync(DB_FILE) || "[]");
const orders = JSON.parse(readFileSync(ORDER_FILE) || "[]");

const drainJson = (req) =>
  new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => {
      resolve(JSON.parse(data));
    });
  });

class ApiError extends Error {
  constructor(statusCode, data) {
    super();
    this.statusCode = statusCode;
    this.data = data;
  }
}

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.url.startsWith("/api/categories")) {
    res.status(200).json(db.categories);
    return;
  }

  if (req.url.startsWith("/api/colors")) {
    res.status(200).json(db.colors);
    return;
  }

  try {
    if (req.method === "POST" && req.url === "/api/order") {
      const order = createOrder(await drainJson(req));
      res.setHeader("Access-Control-Expose-Headers", "Location");
      res.setHeader("Location", `api/order/${order.id}`);
      res.status(201).json(order);
      return;
    }
  } catch (err) {
    if (err instanceof ApiError) {
      res.status(err.statusCode).json(err.data);
    } else {
      res.status(500).json({ message: "Server Error" });
    }
    return;
  }

  if (!req.url.startsWith(URI_PREFIX)) {
    res.status(404).json({ message: "Not Found" });
    return;
  }

  const [uri, query] = req.url.substring(URI_PREFIX.length).split("?");
  const queryParams = {};

  if (query) {
    for (const piece of query.split("&")) {
      const [key, value] = piece.split("=");
      queryParams[key] = value ? decodeURIComponent(value) : "";
    }
  }

  try {
    let body = await (() => {
      const postPrefix = uri.substring(1);
      if (req.method !== "GET") return;

      if (uri === "" || uri === "/") return getGoodsList(queryParams);
      return getItems(postPrefix);
    })();

    res.status(200).json(body);
  } catch (err) {
    if (err instanceof ApiError) {
      res.status(err.statusCode).json(err.data);
    } else {
      res.status(500).json({ message: "Server Error" });
    }
  }
}
