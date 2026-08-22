import type { Database } from "sql.js";
import type { Customer, Inventory, OrderLine, Product, ReplenishmentRequest, SalesOrder, Supplier } from "./domain.js";

export function createSchema(db: Database): void {
  db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, status TEXT NOT NULL,
      credit_status TEXT NOT NULL, priority_level INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY, sku TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
      description TEXT NOT NULL, reorder_point INTEGER NOT NULL,
      default_supplier_id TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS inventory (
      product_id TEXT NOT NULL, warehouse_id TEXT NOT NULL, on_hand INTEGER NOT NULL,
      allocated INTEGER NOT NULL, available INTEGER NOT NULL,
      inbound_quantity INTEGER NOT NULL, inbound_date TEXT,
      PRIMARY KEY (product_id, warehouse_id), FOREIGN KEY (product_id) REFERENCES products(id)
    );
    CREATE TABLE IF NOT EXISTS sales_orders (
      order_id TEXT PRIMARY KEY, customer_id TEXT NOT NULL, status TEXT NOT NULL,
      order_date TEXT NOT NULL, requested_ship_date TEXT NOT NULL,
      priority TEXT NOT NULL, notes TEXT, FOREIGN KEY (customer_id) REFERENCES customers(id)
    );
    CREATE TABLE IF NOT EXISTS sales_order_lines (
      line_id TEXT PRIMARY KEY, order_id TEXT NOT NULL, product_id TEXT NOT NULL,
      quantity_ordered INTEGER NOT NULL, quantity_allocated INTEGER NOT NULL,
      quantity_shipped INTEGER NOT NULL, FOREIGN KEY (order_id) REFERENCES sales_orders(order_id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );
    CREATE TABLE IF NOT EXISTS suppliers (
      supplier_id TEXT PRIMARY KEY, name TEXT NOT NULL,
      average_lead_time_days INTEGER NOT NULL, reliability_score REAL NOT NULL
    );
    CREATE TABLE IF NOT EXISTS replenishment_requests (
      request_id TEXT PRIMARY KEY, product_id TEXT NOT NULL, quantity INTEGER NOT NULL,
      reason TEXT NOT NULL, linked_order_id TEXT, status TEXT NOT NULL,
      created_at TEXT NOT NULL, approved_by TEXT,
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (linked_order_id) REFERENCES sales_orders(order_id)
    );
  `);
}

function queryRows(db: Database, sql: string, params: unknown[] = []): Array<Record<string, any>> {
  const statement = db.prepare(sql);
  statement.bind(params as any[]);
  const rows: Array<Record<string, any>> = [];
  while (statement.step()) rows.push(statement.getAsObject() as Record<string, any>);
  statement.free();
  return rows;
}

export function getOpenOrders(db: Database): SalesOrder[] {
  const rows = queryRows(db, "SELECT * FROM sales_orders WHERE status = 'OPEN' ORDER BY requested_ship_date, order_id");
  return rows.map((row) => ({
    orderId: row.order_id,
    customerId: row.customer_id,
    status: row.status as SalesOrder["status"],
    orderDate: row.order_date,
    requestedShipDate: row.requested_ship_date,
    priority: row.priority as SalesOrder["priority"],
    notes: row.notes ?? null,
    lineItems: queryRows(db, "SELECT line_id AS lineId, product_id AS productId, quantity_ordered AS quantityOrdered, quantity_allocated AS quantityAllocated, quantity_shipped AS quantityShipped FROM sales_order_lines WHERE order_id = ? ORDER BY line_id", [row.order_id]) as OrderLine[],
  }));
}

export function getInventory(db: Database, productId: string): Inventory[] {
  return queryRows(db, "SELECT product_id AS productId, warehouse_id AS warehouseId, on_hand AS onHand, allocated, available, inbound_quantity AS inboundQuantity, inbound_date AS inboundDate FROM inventory WHERE product_id = ? ORDER BY warehouse_id", [productId]) as Inventory[];
}

export function getOrder(db: Database, orderId: string): SalesOrder | null {
  const row = queryRows(db, "SELECT * FROM sales_orders WHERE order_id = ?", [orderId])[0];
  if (!row) return null;
  return {
    orderId: row.order_id, customerId: row.customer_id, status: row.status as SalesOrder["status"],
    orderDate: row.order_date, requestedShipDate: row.requested_ship_date,
    priority: row.priority as SalesOrder["priority"], notes: row.notes ?? null,
    lineItems: queryRows(db, "SELECT line_id AS lineId, product_id AS productId, quantity_ordered AS quantityOrdered, quantity_allocated AS quantityAllocated, quantity_shipped AS quantityShipped FROM sales_order_lines WHERE order_id = ? ORDER BY line_id", [orderId]) as OrderLine[],
  };
}

export function getCustomer(db: Database, customerId: string): Customer | null {
  const row = queryRows(db, "SELECT id, name, status, credit_status AS creditStatus, priority_level AS priorityLevel FROM customers WHERE id = ?", [customerId])[0];
  return row ? row as Customer : null;
}

export function getSupplier(db: Database, supplierId: string): Supplier | null {
  const row = queryRows(db, "SELECT supplier_id AS supplierId, name, average_lead_time_days AS averageLeadTimeDays, reliability_score AS reliabilityScore FROM suppliers WHERE supplier_id = ?", [supplierId])[0];
  return row ? row as Supplier : null;
}

export function getReplenishmentRequests(db: Database, productId?: string, status?: ReplenishmentRequest["status"]): ReplenishmentRequest[] {
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (productId) { conditions.push("product_id = ?"); params.push(productId); }
  if (status) { conditions.push("status = ?"); params.push(status); }
  const where = conditions.length ? ` WHERE ${conditions.join(" AND ")}` : "";
  return queryRows(db, `SELECT request_id AS requestId, product_id AS productId, quantity, reason, linked_order_id AS linkedOrderId, status, created_at AS createdAt, approved_by AS approvedBy FROM replenishment_requests${where} ORDER BY created_at DESC`, params) as ReplenishmentRequest[];
}

export function countRows(db: Database, table: "customers" | "products" | "inventory" | "sales_orders" | "sales_order_lines"): number {
  return queryRows(db, `SELECT COUNT(*) AS count FROM ${table}`)[0].count as number;
}

export type SeedData = { customers: Customer[]; products: Product[]; inventory: Inventory[]; orders: SalesOrder[]; suppliers: Supplier[]; replenishmentRequests: ReplenishmentRequest[] };

export function insertSeedData(db: Database, seed: SeedData): void {
  const insert = (sql: string, values: unknown[]) => db.run(sql, values as any[]);
  db.run("BEGIN");
  try {
    for (const c of seed.customers) insert("INSERT INTO customers (id, name, status, credit_status, priority_level) VALUES (?, ?, ?, ?, ?)", [c.id, c.name, c.status, c.creditStatus, c.priorityLevel]);
    for (const p of seed.products) insert("INSERT INTO products (id, sku, name, description, reorder_point, default_supplier_id) VALUES (?, ?, ?, ?, ?, ?)", [p.id, p.sku, p.name, p.description, p.reorderPoint, p.defaultSupplierId]);
    for (const s of seed.suppliers) insert("INSERT INTO suppliers (supplier_id, name, average_lead_time_days, reliability_score) VALUES (?, ?, ?, ?)", [s.supplierId, s.name, s.averageLeadTimeDays, s.reliabilityScore]);
    for (const i of seed.inventory) insert("INSERT INTO inventory (product_id, warehouse_id, on_hand, allocated, available, inbound_quantity, inbound_date) VALUES (?, ?, ?, ?, ?, ?, ?)", [i.productId, i.warehouseId, i.onHand, i.allocated, i.available, i.inboundQuantity, i.inboundDate]);
    for (const o of seed.orders) {
      insert("INSERT INTO sales_orders (order_id, customer_id, status, order_date, requested_ship_date, priority, notes) VALUES (?, ?, ?, ?, ?, ?, ?)", [o.orderId, o.customerId, o.status, o.orderDate, o.requestedShipDate, o.priority, o.notes]);
      for (const l of o.lineItems) insert("INSERT INTO sales_order_lines (line_id, order_id, product_id, quantity_ordered, quantity_allocated, quantity_shipped) VALUES (?, ?, ?, ?, ?, ?)", [l.lineId, o.orderId, l.productId, l.quantityOrdered, l.quantityAllocated, l.quantityShipped]);
    }
    for (const r of seed.replenishmentRequests) insert("INSERT INTO replenishment_requests (request_id, product_id, quantity, reason, linked_order_id, status, created_at, approved_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [r.requestId, r.productId, r.quantity, r.reason, r.linkedOrderId, r.status, r.createdAt, r.approvedBy]);
    db.run("COMMIT");
  } catch (error) { db.run("ROLLBACK"); throw error; }
}
