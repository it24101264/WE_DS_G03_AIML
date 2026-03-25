const request = require("supertest");
const mongoose = require("mongoose");
const User = require("../src/models/user");
const MarketplaceItem = require("../src/models/MarketplaceItem");

process.env.JWT_SECRET = process.env.JWT_SECRET || "test_jwt_secret";
const app = require("../app");

let buyerToken;
let sellerUser;
const TEST_URI = process.env.MONGO_URI_TEST || "mongodb://127.0.0.1:27017/unimarket_test";

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(TEST_URI);
  }
});

beforeEach(async () => {
  await User.deleteMany({});
  await MarketplaceItem.deleteMany({});

  const buyerRes = await request(app).post("/api/v1/auth/register").send({
    name: "Test Buyer",
    email: "buyer@sliit.lk",
    password: "password123",
    studentId: "IT21000001",
  });
  buyerToken = buyerRes.body.token;

  await request(app).post("/api/v1/auth/register").send({
    name: "Test Seller",
    email: "seller@sliit.lk",
    password: "password123",
    studentId: "IT21000002",
  });

  sellerUser = await User.findOne({ email: "seller@sliit.lk" });

  await MarketplaceItem.insertMany([
    {
      title: "Data Structures Book",
      description: "Good condition textbook",
      price: 1500,
      category: "Books & Notes",
      condition: "Good",
      seller: sellerUser._id,
      status: "available",
    },
    {
      title: "Scientific Calculator",
      description: "Barely used",
      price: 2500,
      category: "Electronics",
      condition: "Like New",
      seller: sellerUser._id,
      status: "available",
    },
    {
      title: "Old Laptop",
      description: "Needs repair",
      price: 15000,
      category: "Electronics",
      condition: "Fair",
      seller: sellerUser._id,
      status: "sold",
    },
  ]);
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
});

describe("GET /api/v1/marketplace/items", () => {
  it("returns only available items", async () => {
    const res = await request(app).get("/api/v1/marketplace/items");

    expect(res.statusCode).toBe(200);
    expect(res.body.items.length).toBe(2);
    res.body.items.forEach((item) => expect(item.status).toBe("available"));
  });

  it("filters by category", async () => {
    const res = await request(app)
      .get("/api/v1/marketplace/items")
      .query({ category: "Electronics" });

    expect(res.statusCode).toBe(200);
    expect(res.body.items.length).toBe(1);
    expect(res.body.items[0].title).toBe("Scientific Calculator");
  });

  it("returns pagination data", async () => {
    const res = await request(app)
      .get("/api/v1/marketplace/items")
      .query({ limit: 1, page: 1 });

    expect(res.statusCode).toBe(200);
    expect(res.body.pagination).toHaveProperty("total");
    expect(res.body.pagination).toHaveProperty("pages");
    expect(res.body.items.length).toBe(1);
  });
});

describe("GET /api/v1/marketplace/items/:id", () => {
  it("returns one item with seller info", async () => {
    const item = await MarketplaceItem.findOne({ title: "Data Structures Book" });
    const res = await request(app).get(`/api/v1/marketplace/items/${item._id}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.item.title).toBe("Data Structures Book");
    expect(res.body.item.seller).toHaveProperty("name");
  });

  it("increments view count", async () => {
    const item = await MarketplaceItem.findOne({ title: "Data Structures Book" });

    await request(app).get(`/api/v1/marketplace/items/${item._id}`);
    await request(app).get(`/api/v1/marketplace/items/${item._id}`);

    const updated = await MarketplaceItem.findById(item._id);
    expect(updated.views).toBe(2);
  });
});

describe("POST /api/v1/marketplace/items/:id/save", () => {
  it("saves an item for a logged in user", async () => {
    const item = await MarketplaceItem.findOne({ title: "Data Structures Book" });
    const res = await request(app)
      .post(`/api/v1/marketplace/items/${item._id}/save`)
      .set("Authorization", `Bearer ${buyerToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.saved).toBe(true);
  });

  it("rejects unauthenticated save", async () => {
    const item = await MarketplaceItem.findOne({ title: "Data Structures Book" });
    const res = await request(app).post(`/api/v1/marketplace/items/${item._id}/save`);
    expect(res.statusCode).toBe(401);
  });
});
