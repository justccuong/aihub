import { sqliteTable, text, integer, int } from 'drizzle-orm/sqlite-core';

/**
 * Database Schema
 * 
 * Cloudflare D1 uses SQLite, so use sqlite-core types
 */

// ============================================
// Better Auth Tables
// ============================================

export const user = sqliteTable('user', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
    image: text('image'),
    createdAt: integer('created_at', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
});

export const session = sqliteTable('session', {
    id: text('id').primaryKey(),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    token: text('token').notNull().unique(),
    createdAt: integer('created_at', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
        .notNull()
        .references(() => user.id, { onDelete: 'cascade' }),
});

export const account = sqliteTable('account', {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
        .notNull()
        .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp' }),
    refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp' }),
    scope: text('scope'),
    password: text('password'),
    createdAt: integer('created_at', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
});

export const verification = sqliteTable('verification', {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' })
        .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
        .$defaultFn(() => new Date()),
});

// ============================================
// Application Tables
// ============================================

export const llms = sqliteTable("llms", {
    id: int("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    description: text("description").default(""),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    baseUrl: text("base_url").notNull(),
    apiKey: text("api_key").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
        .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
        .$defaultFn(() => new Date()),
})

export const datasourceGroups = sqliteTable("datasource_groups", {
    id: int("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    description: text("description").default(""),
    createdAt: integer("created_at", { mode: "timestamp" })
        .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
        .$defaultFn(() => new Date()),
})

export const datasources = sqliteTable("datasources", {
    id: int("id").primaryKey({ autoIncrement: true }),
    content: text("content").notNull(),
    datasourceGroupId: int("datasource_group_id").references(() => datasourceGroups.id, {
        onDelete: "cascade",
    }),
})

export const agents = sqliteTable("agents", {
    id: int("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    description: text("description").default(""),
    systemPrompt: text("system_prompt").default(""),
    topK: int("top_k").default(40),
    temperature: int("temperature").default(70), // 0-100, will be converted to 0.0-1.0
    maxTokens: int("max_tokens").default(1024),
    llmId: int("llm_id").references(() => llms.id, {
        onDelete: "cascade",
    }),
    datasourceGroupId: int("datasource_group_id").references(() => datasourceGroups.id, {
        onDelete: "cascade",
    }),
    createdAt: integer("created_at", { mode: "timestamp" })
        .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
        .$defaultFn(() => new Date()),
})