import { describe, expect, it } from "vitest";
import { calculateShortage, findAtRiskLines } from "../src/domain.js";

describe("shortage rules", () => {
  it("calculates only an unmet quantity", () => {
    expect(calculateShortage(50, 30)).toBe(20);
    expect(calculateShortage(20, 30)).toBe(0);
  });

  it("finds shortages from grounded order and inventory records", () => {
    const result = findAtRiskLines([{ orderId: "SO-1001", customerId: "C-001", status: "OPEN", orderDate: "2026-08-20", requestedShipDate: "2026-08-22", priority: "HIGH", notes: null, lineItems: [{ lineId: "SOL-1", productId: "P-001", quantityOrdered: 50, quantityAllocated: 0, quantityShipped: 0 }] }], new Map([["P-001", 30]]));
    expect(result).toEqual([{ orderId: "SO-1001", lineId: "SOL-1", productId: "P-001", quantityRequired: 50, availableInventory: 30, shortage: 20, requestedShipDate: "2026-08-22" }]);
  });
});
