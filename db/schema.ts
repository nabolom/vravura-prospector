import { sql } from "drizzle-orm";
import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const prospects = sqliteTable("prospects", {
  id: text("id").primaryKey(),
  clee: text("clee").notNull().default(""),
  name: text("name").notNull(),
  legalName: text("legal_name").notNull().default(""),
  activityCode: text("activity_code").notNull().default(""),
  activity: text("activity").notNull(),
  sectorCode: text("sector_code").notNull(),
  employeeBand: text("employee_band").notNull(),
  state: text("state").notNull(),
  municipality: text("municipality").notNull(),
  locality: text("locality").notNull().default(""),
  postalCode: text("postal_code").notNull().default(""),
  address: text("address").notNull().default(""),
  phone: text("phone").notNull().default(""),
  email: text("email").notNull().default(""),
  website: text("website").notNull().default(""),
  score: integer("score").notNull().default(0),
  scoreReasons: text("score_reasons").notNull().default("[]"),
  status: text("status").notNull().default("new"),
  arlUrl: text("arl_url").notNull(),
  source: text("source").notNull().default("denue"),
  isDemo: integer("is_demo", { mode: "boolean" }).notNull().default(false),
  importedAt: text("imported_at").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const importJobs = sqliteTable("import_jobs", {
  id: text("id").primaryKey(),
  stateCodes: text("state_codes").notNull(),
  currentStateIndex: integer("current_state_index").notNull().default(0),
  sector: text("sector").notNull().default("0"),
  stratum: text("stratum").notNull().default("0"),
  pageSize: integer("page_size").notNull().default(100),
  maxRecords: integer("max_records").notNull().default(5000),
  nextRecord: integer("next_record").notNull().default(1),
  processedCount: integer("processed_count").notNull().default(0),
  importedCount: integer("imported_count").notNull().default(0),
  status: text("status").notNull().default("queued"),
  lastError: text("last_error").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
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
