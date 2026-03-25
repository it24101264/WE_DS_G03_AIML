const request = require("supertest");
const mongoose = require("mongoose");
const User = require("../src/models/user");

process.env.JWT_SECRET = process.env.JWT_SECRET || "test_jwt_secret";
const app = require("../app");
const TEST_URI = process.env.MONGO_URI_TEST || "mongodb://127.0.0.1:27017/unimarket_test";

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(TEST_URI);
  }
});

afterEach(async () => {
  await User.deleteMany({});
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
});

describe("POST /api/v1/auth/register", () => {
  it("registers a new user", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({
      name: "Test User",
      email: "test@sliit.lk",
      password: "password123",
      studentId: "IT21000001",
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty("token");
    expect(res.body.data.email).toBe("test@sliit.lk");
  });

  it("rejects duplicate email", async () => {
    await request(app).post("/api/v1/auth/register").send({
      name: "First User",
      email: "test@sliit.lk",
      password: "password123",
      studentId: "IT21000001",
    });

    const res = await request(app).post("/api/v1/auth/register").send({
      name: "Second User",
      email: "test@sliit.lk",
      password: "password123",
      studentId: "IT21000002",
    });

    expect(res.statusCode).toBe(409);
    expect(res.body.message).toBe("Email already exists");
  });

  it("rejects duplicate student ID", async () => {
    await request(app).post("/api/v1/auth/register").send({
      name: "First User",
      email: "first@sliit.lk",
      password: "password123",
      studentId: "IT21000001",
    });

    const res = await request(app).post("/api/v1/auth/register").send({
      name: "Second User",
      email: "second@sliit.lk",
      password: "password123",
      studentId: "IT21000001",
    });

    expect(res.statusCode).toBe(409);
    expect(res.body.message).toBe("Student ID already exists");
  });

  it("rejects missing required fields", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({
      name: "Test User",
      email: "test@sliit.lk",
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Missing fields");
  });
});

describe("POST /api/v1/auth/login", () => {
  beforeEach(async () => {
    await request(app).post("/api/v1/auth/register").send({
      name: "Test User",
      email: "test@sliit.lk",
      password: "password123",
      studentId: "IT21000001",
    });
  });

  it("logs in with correct credentials", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({
      email: "test@sliit.lk",
      password: "password123",
      studentId: "IT21000001",
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty("token");
  });

  it("rejects wrong password", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({
      email: "test@sliit.lk",
      password: "wrongpassword",
      studentId: "IT21000001",
    });

    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe("Invalid credentials");
  });

  it("rejects missing student ID", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({
      email: "test@sliit.lk",
      password: "password123",
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("email, studentId and password required");
  });
});

describe("GET /api/v1/auth/me", () => {
  it("returns logged-in user for valid token", async () => {
    const registerRes = await request(app).post("/api/v1/auth/register").send({
      name: "Test User",
      email: "test@sliit.lk",
      password: "password123",
      studentId: "IT21000001",
    });

    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${registerRes.body.token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe("test@sliit.lk");
  });

  it("rejects missing token", async () => {
    const res = await request(app).get("/api/v1/auth/me");
    expect(res.statusCode).toBe(401);
  });
});
