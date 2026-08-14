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

const googleCalendarConnections = sqliteTable("google_calendar_connections", {
  id: text("id").primaryKey().notNull(),
  calendarId: text("calendar_id").notNull(),
  calendarName: text("calendar_name").notNull(),
  accountEmail: text("account_email").notNull(),
  encryptedRefreshToken: text("encrypted_refresh_token").notNull(),
  syncToken: text("sync_token"),
  lastSyncedAt: integer("last_synced_at"),
  syncStartedAt: integer("sync_started_at"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

const googleCalendarEvents = sqliteTable("google_calendar_events", {
  id: text("id").primaryKey().notNull(),
  summary: text("summary").notNull(),
  description: text("description"),
  location: text("location"),
  startValue: text("start_value").notNull(),
  endValue: text("end_value").notNull(),
  allDay: integer("all_day").default(0).notNull(),
  htmlLink: text("html_link"),
  updatedAt: text("updated_at").notNull(),
});

const googleCalendarBookings = sqliteTable("google_calendar_bookings", {
  reservationId: text("reservation_id").primaryKey().notNull(),
  googleEventId: text("google_event_id").notNull(),
  bookingUpdatedAt: text("booking_updated_at").notNull(),
}, (table) => [uniqueIndex("google_calendar_bookings_event_idx").on(table.googleEventId)]);

const googleCalendarOauthStates = sqliteTable("google_calendar_oauth_states", {
  stateHash: text("state_hash").primaryKey().notNull(),
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
  schema.tables.booking_slots = bookingSlots;
  schema.tables.tv_pairings = tvPairings;
  schema.tables.tv_devices = tvDevices;
  schema.tables.rate_limits = rateLimits;
  schema.tables.google_calendar_connections = googleCalendarConnections;
  schema.tables.google_calendar_events = googleCalendarEvents;
  schema.tables.google_calendar_bookings = googleCalendarBookings;
  schema.tables.google_calendar_oauth_states = googleCalendarOauthStates;
  schema.tables.availability_blocks = availabilityBlocks;
  schema.tables.availability_hours = availabilityHours;
  return schema;
};
