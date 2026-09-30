import { boolean, index, integer, pgEnum, pgTable, real, text, timestamp } from "drizzle-orm/pg-core";

// Tables required by Better Auth. Column names match its drizzle adapter defaults.

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  businessName: text("business_name"),
  // "admin" unlocks /admin. Set by hand in the database; users can't choose it at sign-up.
  role: text("role").notNull().default("user"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// Loopgrain orders. A project is one finished video: the customer uploads
// several raw clips to it, we deliver an edit, and they can ask for revisions.

export const projectStatus = pgEnum("project_status", [
  "draft", // customer is still adding clips
  "submitted", // sent to the editor, not started
  "editing",
  "delivered",
  "revision_requested",
]);

export const project = pgTable(
  "project",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    brief: text("brief"),
    status: projectStatus("status").notNull().default("draft"),
    submittedAt: timestamp("submitted_at"),
    deliveredAt: timestamp("delivered_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("project_user_idx").on(t.userId)],
);

export const clip = pgTable(
  "clip",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    fileName: text("file_name").notNull(),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    // Null when the browser couldn't read it (e.g. HEVC .mov in Chrome on Windows).
    durationSeconds: real("duration_seconds"),
    storageKey: text("storage_key").notNull(),
    // Rows are created before the browser uploads; `uploaded` flips once R2 has the file.
    uploaded: boolean("uploaded").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("clip_project_idx").on(t.projectId)],
);

// A finished edit. Each revision round adds a new version.
export const deliverable = pgTable(
  "deliverable",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    storageKey: text("storage_key").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("deliverable_project_idx").on(t.projectId)],
);

export const revisionRequest = pgTable(
  "revision_request",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    deliverableId: text("deliverable_id")
      .notNull()
      .references(() => deliverable.id, { onDelete: "cascade" }),
    note: text("note").notNull(),
    resolved: boolean("resolved").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("revision_project_idx").on(t.projectId)],
);

export type Project = typeof project.$inferSelect;
export type ProjectStatus = (typeof projectStatus.enumValues)[number];
export type Clip = typeof clip.$inferSelect;
export type Deliverable = typeof deliverable.$inferSelect;
export type RevisionRequest = typeof revisionRequest.$inferSelect;
