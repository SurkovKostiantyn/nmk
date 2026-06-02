const express = require("express");
const app = express();
app.use(express.json());

app.get("/", (req, res) =>
  res.json({ message: "Hello CI/CD!", version: "1.0.0" }),
);
app.get("/health", (req, res) => res.json({ status: "ok" }));

app.post("/sum", (req, res) => {
  const { a, b } = req.body;
  if (typeof a !== "number" || typeof b !== "number")
    return res.status(400).json({ error: "a and b must be numbers" });
  res.json({ result: a + b });
});

module.exports = app;
if (require.main === module)
  app.listen(process.env.PORT || 3000, () => console.log("Running"));
