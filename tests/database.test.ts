import initSqlJs from "sql.js";
import { describe, expect, it } from "vitest";
import { countRows, createSchema, getInventory, getOpenOrders, insertSeedData } from "../src/database.js";
import { seedData } from "../src/seed.js";

describe("seeded ERP database", () => {
  it("creates the Phase 1 demo dataset and exposes open orders/inventory", async () => {
    const SQL = await initSqlJs();
    const db = new SQL.Database();
    createSchema(db);
    insertSeedData(db, seedData);
    expect(countRows(db, "customers")).toBe(10);
    expect(countRows(db, "products")).toBe(20);
    expect(countRows(db, "sales_orders")).toBe(20);
    expect(countRows(db, "sales_order_lines")).toBeGreaterThanOrEqual(30);
    expect(getOpenOrders(db)).toHaveLength(19);
    expect(getInventory(db, "P-001")).toHaveLength(2);
    db.close();
  });
});
