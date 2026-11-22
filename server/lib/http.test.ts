import { describe, expect, it } from "vitest";
import { z } from "zod";
import { zodMessage } from "./http";

function msg(schema: z.ZodTypeAny, value: unknown) {
  const r = schema.safeParse(value);
  if (r.success) throw new Error("expected failure");
  return zodMessage(r.error);
}

describe("zodMessage", () => {
  const store = z.object({
    description: z.string().trim().min(10).max(200),
    contact_number: z.string().trim().min(6),
    name: z.string().trim().min(1),
    price: z.number().min(0),
    body: z.string().min(1, "Message cannot be empty").optional(),
  });
  const ok = {
    description: "Fresh lunch boxes",
    contact_number: "01700000000",
    name: "A",
    price: 1,
  };

  it("explains string length errors in plain words", () => {
    expect(msg(store, { ...ok, description: "Meal" })).toBe(
      "Description must be at least 10 characters.",
    );
    expect(msg(store, { ...ok, description: "x".repeat(201) })).toBe(
      "Description must be at most 200 characters.",
    );
    expect(msg(store, { ...ok, contact_number: "12" })).toBe(
      "Contact number must be at least 6 characters.",
    );
    expect(msg(store, { ...ok, name: "  " })).toBe("Name is required.");
  });

  it("handles missing fields and numbers", () => {
    const { description: _d, ...rest } = ok;
    expect(msg(store, rest)).toBe("Description is required.");
    expect(msg(store, { ...ok, price: -1 })).toBe("Price must be at least 0.");
  });

  it("keeps messages written in the schema", () => {
    expect(msg(store, { ...ok, body: "" })).toBe("Message cannot be empty");
  });
});
