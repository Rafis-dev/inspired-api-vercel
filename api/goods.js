import { readFileSync } from "fs";
import { join } from "path";

// Путь к db.json
const DB_PATH = join(process.cwd(), "db.json");

export default function handler(req, res) {
  try {
    // Читаем данные из db.json
    const db = JSON.parse(readFileSync(DB_PATH, "utf-8"));

    // Получаем query параметры
    const {
      gender,
      category,
      page = 1,
      count = 12,
      search,
      list,
      top,
      exclude,
      type,
    } = req.query;

    let goods = [...db.goods];

    // Фильтрация по полу
    if (gender && gender !== "all") {
      goods = goods.filter((item) => item.gender === gender);
    }

    // Фильтрация по категории
    if (category) {
      goods = goods.filter((item) => item.category === category);
    }

    // Фильтрация по типу (top)
    if (top === "true") {
      goods = goods.filter((item) => item.top === true);
    }

    // Поиск
    if (search) {
      const searchTerm = search.toLowerCase();
      goods = goods.filter(
        (item) =>
          item.title.toLowerCase().includes(searchTerm) ||
          item.description.toLowerCase().includes(searchTerm)
      );
    }

    // Получение по списку ID
    if (list) {
      const idList = list.split(",");
      goods = goods.filter((item) => idList.includes(item.id));
    }

    // Исключение товара
    if (exclude) {
      goods = goods.filter((item) => item.id !== exclude);
    }

    // Фильтрация по type (если есть в вашей структуре)
    if (type) {
      goods = goods.filter((item) => item.type === type);
    }

    // Пагинация
    const pageNum = parseInt(page);
    const countNum = parseInt(count);
    const startIndex = (pageNum - 1) * countNum;
    const endIndex = startIndex + countNum;

    const paginatedGoods = goods.slice(startIndex, endIndex);

    // Устанавливаем CORS заголовки
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

    // Возвращаем результат
    res.status(200).json({
      goods: paginatedGoods,
      page: pageNum,
      pages: Math.ceil(goods.length / countNum),
      totalCount: goods.length,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: error.message,
    });
  }
}
