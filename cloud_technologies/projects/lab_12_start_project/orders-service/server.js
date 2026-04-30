const express = require("express");
const app = express();
app.use(express.json());

const USERS_URL = process.env.USERS_SERVICE_URL || "http://users-service:3001";
const PRODUCTS_URL =
  process.env.PRODUCTS_SERVICE_URL || "http://products-service:3002";

const orders = [];
let nextId = 1;

app.post("/orders", async (req, res) => {
  const { userId, productId } = req.body;
  try {
    // Перевірка існування користувача та продукту
    const [userRes, productRes] = await Promise.all([
      fetch(`${USERS_URL}/users/${userId}`),
      fetch(`${PRODUCTS_URL}/products/${productId}`),
    ]);

    if (!userRes.ok) return res.status(404).json({ error: "User not found" });
    if (!productRes.ok)
      return res.status(404).json({ error: "Product not found" });

    const [user, product] = await Promise.all([
      userRes.json(),
      productRes.json(),
    ]);

    const order = {
      id: nextId++,
      userId,
      productId,
      userName: user.name,
      productName: product.name,
      price: product.price,
      createdAt: new Date().toISOString(),
    };
    orders.push(order);
    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/orders", (req, res) => res.json(orders));

app.listen(3003, () => console.log("Orders Service on port 3003"));
