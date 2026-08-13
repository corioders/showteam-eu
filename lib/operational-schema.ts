import type { SQLiteSchemaHook } from "@payloadcms/db-d1-sqlite";
import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

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

const rateLimits = sqliteTable("rate_limits", {
  key: text("key").primaryKey().notNull(),
  count: integer("count").notNull(),
  expiresAt: integer("expires_at").notNull(),
});

const calendarFeeds = sqliteTable("calendar_feeds", {
  id: text("id").primaryKey().notNull(),
  tokenHash: text("token_hash").notNull(),
  name: text("name").notNull(),
  createdAt: integer("created_at").notNull(),
});

const availabilityBlocks = sqliteTable("availability_blocks", {
  id: text("id").primaryKey().notNull(),
  equipmentId: integer("equipment_id"),
  bookingDate: text("booking_date").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  reason: text("reason"),
  createdAt: integer("created_at").notNull(),
}, (table) => [index("availability_blocks_date_equipment_idx").on(table.bookingDate, table.equipmentId)]);

export const preserveOperationalTables: SQLiteSchemaHook = ({ schema }) => {
  schema.tables.booking_slots = bookingSlots;
  schema.tables.tv_pairings = tvPairings;
  schema.tables.tv_devices = tvDevices;
  schema.tables.rate_limits = rateLimits;
  schema.tables.calendar_feeds = calendarFeeds;
  schema.tables.availability_blocks = availabilityBlocks;
  return schema;
};
