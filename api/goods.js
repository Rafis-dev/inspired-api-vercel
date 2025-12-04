import { readFileSync } from "node:fs";
import path from "path";
import * as url from "url";

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));
const DB_FILE = path.resolve(__dirname, "../db.json");

const db = JSON.parse(readFileSync(DB_FILE, "utf-8"));

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
    if (!params.gender) return [];
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

export default function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const params = Object.fromEntries(url.searchParams.entries());

  const result = getGoodsList(params);
  res.status(200).json(result);
}
