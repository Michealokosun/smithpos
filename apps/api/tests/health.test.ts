import request from "supertest";
import { describe, expect, it } from "vitest";
import app, { createApp } from "../src/app.js";

describe("GET /api/health", () => {
  it("exports the Express app as a callable default handler", () => {
    expect(typeof app).toBe("function");
  });

  it("returns the API health status", async () => {
    const response = await request(createApp()).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: "ok",
      service: "pos-api",
    });
  });
});
