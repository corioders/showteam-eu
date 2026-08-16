import type { SQLiteSchemaHook } from "@payloadcms/db-d1-sqlite";
import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const bookingSlots = sqliteTable("booking_slots", {
  equipmentId: integer("equipment_id").notNull(),
  bookingDate: text("booking_date").notNull(),
  startTime: text("start_time").notNull(),
  unitNumber: integer("unit_number").notNull(),
  reservationId: text("reservation_id").notNull(),
  resourceKey: text("resource_key").notNull(),
}, (table) => [
  primaryKey({ columns: [table.equipmentId, table.bookingDate, table.startTime, table.unitNumber] }),
  uniqueIndex("booking_slots_reservation_id_idx").on(table.reservationId),
  uniqueIndex("booking_slots_resource_idx").on(table.resourceKey, table.bookingDate, table.startTime, table.unitNumber),
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

const staffEvents = sqliteTable("staff_events", {
  id: text("id").primaryKey().notNull(),
  title: text("title").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date"),
  startTime: text("start_time"),
  endTime: text("end_time"),
  allDay: integer("all_day").default(0).notNull(),
  blocksBase: integer("blocks_base").default(1).notNull(),
  notes: text("notes"),
  recurrence: text("recurrence").default("none").notNull(),
  recurrenceUntil: text("recurrence_until"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [index("staff_events_dates_idx").on(table.startDate, table.recurrenceUntil)]);

const pushSubscriptions = sqliteTable("push_subscriptions", {
  id: text("id").primaryKey().notNull(),
  userId: integer("user_id").notNull(),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [uniqueIndex("push_subscriptions_endpoint_idx").on(table.endpoint), index("push_subscriptions_user_idx").on(table.userId)]);

export const preserveOperationalTables: SQLiteSchemaHook = ({ schema }) => {
  schema.tables.booking_slots = bookingSlots;
  schema.tables.tv_pairings = tvPairings;
  schema.tables.tv_devices = tvDevices;
  schema.tables.rate_limits = rateLimits;
  schema.tables.staff_events = staffEvents;
  schema.tables.push_subscriptions = pushSubscriptions;
  return schema;
};
