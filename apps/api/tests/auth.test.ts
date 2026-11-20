import { afterEach, describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../src/auth/password.js";
import {
  createAccessToken,
  createRefreshToken,
  hashRefreshToken,
  verifyAccessToken,
} from "../src/auth/tokens.js";

describe("authentication primitives", () => {
  afterEach(() => {
    delete process.env.ACCESS_TOKEN_SECRET;
  });

  it("hashes passwords and rejects mismatches", async () => {
    const hash = await hashPassword("correct horse battery");

    await expect(verifyPassword("correct horse battery", hash)).resolves.toBe(
      true,
    );
    await expect(verifyPassword("different password", hash)).resolves.toBe(
      false,
    );
    await expect(verifyPassword("anything", "invalid-hash")).resolves.toBe(
      false,
    );
  });

  it("issues verifiable access tokens for a session", async () => {
    process.env.ACCESS_TOKEN_SECRET = "test-secret-with-more-than-32-bytes";
    const token = await createAccessToken(
      "3f26cb0d-fd5e-4f57-9e5e-dc79b31cc99d",
      "92c71942-4cb7-4e8d-90f3-b5f255bf67cd",
    );

    await expect(verifyAccessToken(token)).resolves.toEqual({
      userId: "3f26cb0d-fd5e-4f57-9e5e-dc79b31cc99d",
      sessionId: "92c71942-4cb7-4e8d-90f3-b5f255bf67cd",
    });
    await expect(verifyAccessToken("not-a-token")).resolves.toBeNull();
  });

  it("creates opaque refresh tokens and stores only their digests", () => {
    const token = createRefreshToken();
    const digest = hashRefreshToken(token);

    expect(token).not.toBe(digest);
    expect(digest).toMatch(/^[a-f0-9]{64}$/);
    expect(hashRefreshToken(token)).toBe(digest);
  });
});
