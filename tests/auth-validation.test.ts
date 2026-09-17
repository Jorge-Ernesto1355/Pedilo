import { describe, expect, it } from "vitest";

import { loginSchema, registerSchema } from "@/app/auth/lib/validation";

describe("loginSchema", () => {
  it.each([
    ["valid email and password", { email: "owner@example.com", password: "correct-horse", remember: false }],
    ["email surrounded by whitespace", { email: "  OWNER@Example.COM ", password: "correct-horse", remember: false }],
  ])("accepts %s", (_label, input) => {
    const result = loginSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe("owner@example.com");
  });

  it.each([
    ["missing email", { password: "correct-horse" }],
    ["empty email", { email: "", password: "correct-horse" }],
    ["malformed email", { email: "owner@", password: "correct-horse" }],
    ["missing password", { email: "owner@example.com" }],
    ["empty password", { email: "owner@example.com", password: "" }],
    ["password below minimum", { email: "owner@example.com", password: "short" }],
    ["password above maximum", { email: "owner@example.com", password: "p".repeat(129) }],
    ["null input", null],
    ["incorrect email type", { email: 42, password: "correct-horse" }],
    ["incorrect password type", { email: "owner@example.com", password: 42 }],
    ["unexpected fields", { email: "owner@example.com", password: "correct-horse", role: "admin" }],
    ["very long email", { email: `${"a".repeat(250)}@example.com`, password: "correct-horse" }],
  ])("rejects %s", (_label, input) => {
    expect(loginSchema.safeParse(input).success).toBe(false);
  });
});

describe("registerSchema", () => {
  const valid = {
    name: "Ana López",
    email: "OWNER@example.com ",
    password: "correct-horse-7",
    confirm: "correct-horse-7",
    terms: true,
  };

  it("accepts a valid registration and normalizes the email", () => {
    const result = registerSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe("owner@example.com");
  });

  it.each([
    ["missing name", { ...valid, name: undefined }],
    ["empty name", { ...valid, name: "   " }],
    ["missing email", { ...valid, email: undefined }],
    ["invalid email", { ...valid, email: "not-an-email" }],
    ["missing password", { ...valid, password: undefined }],
    ["weak password below minimum", { ...valid, password: "1234567", confirm: "1234567" }],
    ["password above maximum", { ...valid, password: "p".repeat(129), confirm: "p".repeat(129) }],
    ["missing confirmation", { ...valid, confirm: undefined }],
    ["password mismatch", { ...valid, confirm: "different-password" }],
    ["terms not accepted", { ...valid, terms: false }],
    ["business field removed", { ...valid, business: "La Esquina" }],
    ["null input", null],
    ["incorrect name type", { ...valid, name: 42 }],
    ["incorrect terms type", { ...valid, terms: "yes" }],
    ["unexpected fields", { ...valid, isAdmin: true }],
    ["unicode-only invalid email", { ...valid, email: "éxample" }],
  ])("rejects %s", (_label, input) => {
    expect(registerSchema.safeParse(input).success).toBe(false);
  });

  it("reports multiple invalid fields at once", () => {
    const result = registerSchema.safeParse({ name: "", email: "bad", password: "x", confirm: "y", terms: false });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(new Set(result.error.issues.map((issue) => issue.path[0]))).toEqual(
        new Set(["name", "email", "password", "terms"]),
      );
    }
  });
});
