import { sql } from "drizzle-orm";
import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const prospects = sqliteTable("prospects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  legalName: text("legal_name").notNull().default(""),
  activity: text("activity").notNull(),
  sectorCode: text("sector_code").notNull(),
  employeeBand: text("employee_band").notNull(),
  state: text("state").notNull(),
  municipality: text("municipality").notNull(),
  phone: text("phone").notNull().default(""),
  email: text("email").notNull().default(""),
  website: text("website").notNull().default(""),
  score: integer("score").notNull().default(0),
  status: text("status").notNull().default("new"),
  arlUrl: text("arl_url").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const campaigns = sqliteTable("campaigns", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const campaignProspects = sqliteTable(
  "campaign_prospects",
  {
    campaignId: integer("campaign_id").notNull(),
    prospectId: text("prospect_id").notNull(),
    addedAt: text("added_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [primaryKey({ columns: [table.campaignId, table.prospectId] })],
);

export const arlEvents = sqliteTable("arl_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  prospectId: text("prospect_id").notNull(),
  eventType: text("event_type").notNull(),
  occurredAt: text("occurred_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
