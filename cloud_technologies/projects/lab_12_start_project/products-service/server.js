const express = require("express");
const app = express();
app.use(express.json());

const products = [
  { id: 1, name: "Ноутбук", price: 30000, stock: 10 },
  { id: 2, name: "Мишка", price: 500, stock: 50 },
  { id: 3, name: "Клавіатура", price: 1200, stock: 30 },
];

app.get("/products", (req, res) => res.json(products));
app.get("/products/:id", (req, res) => {
  const product = products.find((p) => p.id === parseInt(req.params.id));
  product
    ? res.json(product)
    : res.status(404).json({ error: "Product not found" });
});

app.listen(3002, () => console.log("Products Service on port 3002"));
