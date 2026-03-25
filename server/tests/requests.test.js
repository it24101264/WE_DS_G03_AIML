const request = require("supertest");
const mongoose = require("mongoose");
const User = require("../src/models/user");
const MarketplaceItem = require("../src/models/MarketplaceItem");
const MarketplaceRequest = require("../src/models/MarketplaceRequest");

process.env.JWT_SECRET = process.env.JWT_SECRET || "test_jwt_secret";
const app = require("../app");

let buyerToken;
let sellerToken;
let itemId;
let requestId;
const TEST_URI = process.env.MONGO_URI_TEST || "mongodb://127.0.0.1:27017/unimarket_test";

const pickupPayload = {
  pickupLocation: "study_area",
  pickupLocationName: "Study Area",
  pickupDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
  pickupTime: "10:00-11:00 AM",
};

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(TEST_URI);
  }
});

beforeEach(async () => {
  await User.deleteMany({});
  await MarketplaceItem.deleteMany({});
  await MarketplaceRequest.deleteMany({});

  const buyerRes = await request(app).post("/api/v1/auth/register").send({
    name: "Test Buyer",
    email: "buyer@sliit.lk",
    password: "password123",
    studentId: "IT21000001",
  });
  buyerToken = buyerRes.body.token;

  const sellerRes = await request(app).post("/api/v1/auth/register").send({
    name: "Test Seller",
    email: "seller@sliit.lk",
    password: "password123",
    studentId: "IT21000002",
  });
  sellerToken = sellerRes.body.token;

  const seller = await User.findOne({ email: "seller@sliit.lk" });
  const item = await MarketplaceItem.create({
    title: "Data Structures Textbook",
    description: "Used once, good condition",
    price: 1500,
    category: "Books & Notes",
    condition: "Good",
    seller: seller._id,
    status: "available",
  });
  itemId = item._id;
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
});

describe("POST /api/v1/marketplace/requests", () => {
  it("creates a request when valid", async () => {
    const res = await request(app)
      .post("/api/v1/marketplace/requests")
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({
        itemId: String(itemId),
        message: "Interested!",
        offerPrice: 1400,
        ...pickupPayload,
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.request.status).toBe("pending");
  });

  it("rejects missing pickup fields", async () => {
    const res = await request(app)
      .post("/api/v1/marketplace/requests")
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({ itemId: String(itemId), message: "Interested!" });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Pickup venue, date, and time are required");
  });

  it("rejects non-positive offer price", async () => {
    const res = await request(app)
      .post("/api/v1/marketplace/requests")
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({
        itemId: String(itemId),
        offerPrice: 0,
        ...pickupPayload,
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Offer price must be greater than 0");
  });

  it("rejects message above 150 chars", async () => {
    const longText = "x".repeat(151);
    const res = await request(app)
      .post("/api/v1/marketplace/requests")
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({
        itemId: String(itemId),
        message: longText,
        ...pickupPayload,
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Description/message must be 150 characters or less");
  });

  it("does not allow seller to request own item", async () => {
    const res = await request(app)
      .post("/api/v1/marketplace/requests")
      .set("Authorization", `Bearer ${sellerToken}`)
      .send({ itemId: String(itemId), ...pickupPayload });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("You cannot buy your own item");
  });
});

describe("GET /api/v1/marketplace/requests/my", () => {
  it("returns buyer requests", async () => {
    await request(app)
      .post("/api/v1/marketplace/requests")
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({ itemId: String(itemId), ...pickupPayload });

    const res = await request(app)
      .get("/api/v1/marketplace/requests/my")
      .set("Authorization", `Bearer ${buyerToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.requests.length).toBe(1);
  });
});

describe("PUT and DELETE /api/v1/marketplace/requests/:id", () => {
  beforeEach(async () => {
    const created = await request(app)
      .post("/api/v1/marketplace/requests")
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({ itemId: String(itemId), ...pickupPayload });
    requestId = created.body.request._id;
  });

  it("updates a pending request", async () => {
    const res = await request(app)
      .put(`/api/v1/marketplace/requests/${requestId}`)
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({ message: "Updated message", offerPrice: 1200 });

    expect(res.statusCode).toBe(200);
    expect(res.body.request.message).toBe("Updated message");
  });

  it("cancels a pending request", async () => {
    const res = await request(app)
      .delete(`/api/v1/marketplace/requests/${requestId}`)
      .set("Authorization", `Bearer ${buyerToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Request cancelled");
  });
});
