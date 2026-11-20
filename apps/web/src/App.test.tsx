import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App", () => {
  it("shows the project foundation status", () => {
    render(<App />);
    expect(
      screen.getByRole("heading", { name: "Retail POS" }),
    ).toBeInTheDocument();
  });
});
