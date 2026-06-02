const request = require("supertest");
const app = require("./server");

describe("API Tests", () => {
  test("GET / returns hello message", async () => {
    const res = await request(app).get("/");
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Hello CI/CD!");
  });

  test("GET /health returns ok", async () => {
    const res = await request(app).get("/health");
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  test("POST /sum calculates correctly", async () => {
    const res = await request(app).post("/sum").send({ a: 5, b: 3 });
    expect(res.statusCode).toBe(200);
    expect(res.body.result).toBe(8);
  });

  test("POST /sum returns error for non-numbers", async () => {
    const res = await request(app).post("/sum").send({ a: "abc", b: 3 });
    expect(res.statusCode).toBe(400);
  });
});
