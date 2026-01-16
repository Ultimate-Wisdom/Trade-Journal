import { describe, it, expect } from "vitest";

describe("Sample Test Suite", () => {
  it("should pass a basic math test", () => {
    expect(1 + 1).toBe(2);
  });

  it("should validate string equality", () => {
    expect("hello").toBe("hello");
  });

  it("should check truthy values", () => {
    expect(true).toBeTruthy();
    expect(false).toBeFalsy();
  });
});
