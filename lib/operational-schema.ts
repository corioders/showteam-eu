import type { SQLiteSchemaHook } from "@payloadcms/db-d1-sqlite";
import { integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const bookingSlots = sqliteTable("booking_slots", {
  equipmentId: integer("equipment_id").notNull(),
  bookingDate: text("booking_date").notNull(),
  startTime: text("start_time").notNull(),
  unitNumber: integer("unit_number").notNull(),
  reservationId: text("reservation_id").notNull(),
}, (table) => [
  primaryKey({ columns: [table.equipmentId, table.bookingDate, table.startTime, table.unitNumber] }),
  uniqueIndex("booking_slots_reservation_id_idx").on(table.reservationId),
]);

const tvPairings = sqliteTable("tv_pairings", {
  id: text("id").primaryKey().notNull(),
  secretHash: text("secret_hash").notNull(),
  userCode: text("user_code").notNull(),
  expiresAt: integer("expires_at").notNull(),
  approved: integer("approved").default(0).notNull(),
});

const tvDevices = sqliteTable("tv_devices", {
  id: text("id").primaryKey().notNull(),
  tokenHash: text("token_hash").notNull(),
  name: text("name").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const preserveOperationalTables: SQLiteSchemaHook = ({ schema }) => {
  schema.tables.booking_slots = bookingSlots;
  schema.tables.tv_pairings = tvPairings;
  schema.tables.tv_devices = tvDevices;
  return schema;
};
