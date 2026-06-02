const express = require("express");
const app = express();
app.use(express.json());

const users = [
  { id: 1, name: "Іван Петренко", email: "ivan@example.com" },
  { id: 2, name: "Марія Коваленко", email: "maria@example.com" },
];

app.get("/users", (req, res) => res.json(users));
app.get("/users/:id", (req, res) => {
  const user = users.find((u) => u.id === parseInt(req.params.id));
  user ? res.json(user) : res.status(404).json({ error: "User not found" });
});

app.listen(3001, () => console.log("Users Service on port 3001"));
