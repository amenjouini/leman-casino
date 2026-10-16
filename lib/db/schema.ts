import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  customType,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer; driverData: Buffer | Uint8Array }>({
  dataType() {
    return "bytea";
  },
  fromDriver(value) {
    return Buffer.isBuffer(value) ? value : Buffer.from(value);
  },
});

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

/* ───────────────────────────── Staff & sessions ───────────────────────────── */

export const userRole = pgEnum("user_role", ["owner", "manager", "staff"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: userRole("role").notNull().default("staff"),
  active: boolean("active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  ...timestamps,
});

export const sessions = pgTable(
  "sessions",
  {
    // SHA-256 of the cookie token; the raw token is never stored.
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

/* ──────────────────────────────── Tournaments ─────────────────────────────── */

export const tournamentStatus = pgEnum("tournament_status", ["draft", "published", "archived"]);
export const registrationMode = pgEnum("registration_mode", ["auto", "open", "closed"]);
export const seatSelection = pgEnum("seat_selection", ["owner", "player"]);

export const tournaments = pgTable(
  "tournaments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    gameVariant: text("game_variant").notNull().default("No Limit Hold'em"),
    format: text("format").notNull().default("Freezeout"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    registrationOpensAt: timestamp("registration_opens_at", { withTimezone: true }),
    registrationClosesAt: timestamp("registration_closes_at", { withTimezone: true }),
    registrationMode: registrationMode("registration_mode").notNull().default("auto"),
    currency: text("currency").notNull().default("CHF"),
    // Amounts are stored in minor units (centimes) to avoid floating point errors.
    buyInCents: integer("buy_in_cents"),
    feeCents: integer("fee_cents"),
    guaranteeCents: integer("guarantee_cents"),
    // Bounty part of the entry (e.g. 90 + 60 bounty + 35 fee).
    bountyCents: integer("bounty_cents"),
    // Number of re-entries allowed (0 = freezeout, null = not specified).
    reentryCount: integer("reentry_count"),
    // When set, registrations happen on an external platform (e.g. check-raise.ch).
    externalBookingUrl: text("external_booking_url"),
    // Price of a re-entry and its rake (when different from / in addition to the buy-in).
    reentryPriceCents: integer("reentry_price_cents"),
    reentryFeeCents: integer("reentry_fee_cents"),
    // Structured blind levels (preferred over the free-text blindStructure).
    levels: jsonb("levels").$type<BlindLevel[]>().notNull().default(sql`'[]'::jsonb`),
    // Results: total entries (incl. re-entries) and publication of the ranking.
    entriesCount: integer("entries_count"),
    resultsPublished: boolean("results_published").notNull().default(false),
    startingStack: integer("starting_stack"),
    blindLevelMinutes: integer("blind_level_minutes"),
    blindStructure: text("blind_structure").notNull().default(""),
    lateRegistration: text("late_registration").notNull().default(""),
    reentryPolicy: text("reentry_policy").notNull().default(""),
    rules: text("rules").notNull().default(""),
    venue: text("venue").notNull().default(""),
    coverImageUrl: text("cover_image_url"),
    tableCount: integer("table_count").notNull().default(1),
    seatsPerTable: integer("seats_per_table").notNull().default(9),
    tableLabels: jsonb("table_labels").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    capacity: integer("capacity").notNull(),
    maxPlacesPerBooking: integer("max_places_per_booking").notNull().default(1),
    seatSelection: seatSelection("seat_selection").notNull().default("owner"),
    waitlistEnabled: boolean("waitlist_enabled").notNull().default(true),
    featured: boolean("featured").notNull().default(false),
    status: tournamentStatus("status").notNull().default("draft"),
    ...timestamps,
  },
  (t) => [
    index("tournaments_starts_idx").on(t.startsAt),
    index("tournaments_status_idx").on(t.status),
    check("tournaments_capacity_positive", sql`${t.capacity} > 0`),
    check("tournaments_tables_positive", sql`${t.tableCount} > 0 AND ${t.seatsPerTable} > 0`),
    check("tournaments_amounts_positive", sql`coalesce(${t.buyInCents}, 0) >= 0 AND coalesce(${t.feeCents}, 0) >= 0`),
    check("tournaments_max_places", sql`${t.maxPlacesPerBooking} BETWEEN 1 AND 20`),
  ],
);

/* ───────────────────────────── Players & bookings ─────────────────────────── */

export const players = pgTable(
  "players",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Normalised (trimmed, lower-cased) email is the player's natural key.
    email: text("email").notNull().unique(),
    fullName: text("full_name").notNull(),
    phone: text("phone"),
    notes: text("notes").notNull().default(""),
    ...timestamps,
  },
  (t) => [index("players_name_idx").on(t.fullName)],
);

export const bookingStatus = pgEnum("booking_status", [
  "pending",
  "confirmed",
  "waitlisted",
  "cancelled",
  "rejected",
  "attended",
  "no_show",
]);

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reference: text("reference").notNull().unique(),
    tournamentId: uuid("tournament_id")
      .notNull()
      .references(() => tournaments.id, { onDelete: "restrict" }),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "restrict" }),
    // Contact snapshot at booking time (editable by staff).
    fullName: text("full_name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    places: integer("places").notNull().default(1),
    message: text("message").notNull().default(""),
    status: bookingStatus("status").notNull().default("pending"),
    staffNote: text("staff_note").notNull().default(""),
    idempotencyKey: text("idempotency_key").unique(),
    source: text("source").notNull().default("web"),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    checkedInAt: timestamp("checked_in_at", { withTimezone: true }),
    reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),
    // Pseudonym shown in the public list of registered players, only if the player opted in.
    publicName: text("public_name"),
    showPublicly: boolean("show_publicly").notNull().default(false),
    ...timestamps,
  },
  (t) => [
    index("bookings_tournament_idx").on(t.tournamentId, t.status),
    index("bookings_player_idx").on(t.playerId),
    index("bookings_created_idx").on(t.createdAt),
    check("bookings_places_positive", sql`${t.places} BETWEEN 1 AND 20`),
  ],
);

/**
 * One row per occupied seat. Seats are released (rows deleted) when a booking
 * leaves an active status, so the unique index guarantees that no two active
 * bookings can hold the same seat of the same tournament.
 */
export const seatAssignments = pgTable(
  "seat_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tournamentId: uuid("tournament_id")
      .notNull()
      .references(() => tournaments.id, { onDelete: "cascade" }),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    tableNumber: integer("table_number").notNull(),
    seatNumber: integer("seat_number").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("seat_unique_per_tournament").on(t.tournamentId, t.tableNumber, t.seatNumber),
    index("seat_booking_idx").on(t.bookingId),
    check("seat_numbers_positive", sql`${t.tableNumber} > 0 AND ${t.seatNumber} > 0`),
  ],
);

/* ──────────────────────────────── Results ───────────────────────────────── */

export const tournamentResults = pgTable(
  "tournament_results",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tournamentId: uuid("tournament_id")
      .notNull()
      .references(() => tournaments.id, { onDelete: "cascade" }),
    rank: integer("rank").notNull(),
    // Name as published (pseudonym or full name, chosen by staff with the player's consent).
    displayName: text("display_name").notNull().default(""),
    prizeCents: integer("prize_cents"),
    deal: boolean("deal").notNull().default(false),
    bookingId: uuid("booking_id").references(() => bookings.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("results_tournament_idx").on(t.tournamentId, t.rank),
    check("results_rank_positive", sql`${t.rank} > 0`),
  ],
);

/* ────────────────────────────── Notifications ─────────────────────────────── */

export const emailStatus = pgEnum("email_status", ["sent", "failed", "skipped"]);

export const emailLog = pgTable(
  "email_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id").references(() => bookings.id, { onDelete: "set null" }),
    template: text("template").notNull(),
    recipient: text("recipient").notNull(),
    subject: text("subject").notNull(),
    status: emailStatus("status").notNull(),
    error: text("error"),
    providerMessageId: text("provider_message_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("email_log_booking_idx").on(t.bookingId), index("email_log_created_idx").on(t.createdAt)],
);

/* ──────────────────────────── Settings, audit, media ──────────────────────── */

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
});

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    // Denormalised so the trail survives user deletion.
    actorLabel: text("actor_label").notNull(),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    bookingId: uuid("booking_id").references(() => bookings.id, { onDelete: "set null" }),
    details: jsonb("details").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("audit_entity_idx").on(t.entityType, t.entityId),
    index("audit_booking_idx").on(t.bookingId),
    index("audit_created_idx").on(t.createdAt),
  ],
);

export const media = pgTable("media", {
  id: uuid("id").primaryKey().defaultRandom(),
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  data: bytea("data").notNull(),
  uploadedBy: uuid("uploaded_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Fixed-window counters used to rate-limit public endpoints across instances. */
export const rateLimits = pgTable(
  "rate_limits",
  {
    key: text("key").notNull(),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    count: integer("count").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.key, t.windowStart] })],
);

export type BlindLevel = { sb: number; bb: number; ante: number | null; minutes: number; isBreak?: boolean; label?: string };
export type TournamentResult = typeof tournamentResults.$inferSelect;
export type User = typeof users.$inferSelect;
export type Tournament = typeof tournaments.$inferSelect;
export type NewTournament = typeof tournaments.$inferInsert;
export type Player = typeof players.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type SeatAssignment = typeof seatAssignments.$inferSelect;
export type BookingStatus = (typeof bookingStatus.enumValues)[number];
export type UserRole = (typeof userRole.enumValues)[number];
export type EmailLogEntry = typeof emailLog.$inferSelect;
