import type { SQLiteSchemaHook } from "@payloadcms/db-d1-sqlite";
import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// The retired public events collection remains temporarily until its table is
// replaced by the staff calendar event model.
const legacyMediaReference = sqliteTable("media", { id: integer("id").primaryKey() });
const legacyEvents = sqliteTable("events", {
  id: integer("id").primaryKey().notNull(),
  title: text("title").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date"),
  location: text("location").notNull(),
  summary: text("summary").notNull(),
  imageId: integer("image_id").notNull().references(() => legacyMediaReference.id, { onDelete: "set null" }),
  category: text("category").default("Lato").notNull(),
  published: integer("published", { mode: "boolean" }).default(true),
  ctaLabel: text("cta_label").default("Zapytaj o miejsce"),
  updatedAt: text("updated_at").default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`).notNull(),
  createdAt: text("created_at").default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`).notNull(),
}, (table) => [index("events_image_idx").on(table.imageId), index("events_updated_at_idx").on(table.updatedAt), index("events_created_at_idx").on(table.createdAt)]);

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

const availabilityBlocks = sqliteTable("availability_blocks", {
  id: text("id").primaryKey().notNull(),
  equipmentId: integer("equipment_id"),
  bookingDate: text("booking_date").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  reason: text("reason"),
  createdAt: integer("created_at").notNull(),
}, (table) => [index("availability_blocks_date_equipment_idx").on(table.bookingDate, table.equipmentId)]);

const availabilityHours = sqliteTable("availability_hours", {
  id: text("id").primaryKey().notNull(),
  equipmentId: integer("equipment_id"),
  ruleType: text("rule_type").notNull(),
  bookingDate: text("booking_date"),
  weekdays: text("weekdays"),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  name: text("name"),
  createdAt: integer("created_at").notNull(),
}, (table) => [index("availability_hours_equipment_type_idx").on(table.equipmentId, table.ruleType)]);

export const preserveOperationalTables: SQLiteSchemaHook = ({ schema }) => {
  schema.tables.events = legacyEvents;
  schema.tables.booking_slots = bookingSlots;
  schema.tables.tv_pairings = tvPairings;
  schema.tables.tv_devices = tvDevices;
  schema.tables.rate_limits = rateLimits;
  schema.tables.availability_blocks = availabilityBlocks;
  schema.tables.availability_hours = availabilityHours;
  return schema;
};
