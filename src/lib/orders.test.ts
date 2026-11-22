import { describe, expect, it } from "vitest";
import { allowedOrderStatuses, isFinalOrderStatus } from "@/lib/orders";

describe("order status transitions", () => {
  it("only offers forward moves plus cancel", () => {
    expect(allowedOrderStatuses("pending")).toEqual([
      "pending",
      "confirmed",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
    ]);
    expect(allowedOrderStatuses("shipped")).toEqual(["shipped", "delivered", "cancelled"]);
  });
  it("locks final states", () => {
    expect(allowedOrderStatuses("delivered")).toEqual(["delivered"]);
    expect(allowedOrderStatuses("cancelled")).toEqual(["cancelled"]);
    expect(isFinalOrderStatus("delivered")).toBe(true);
    expect(isFinalOrderStatus("processing")).toBe(false);
  });
});
