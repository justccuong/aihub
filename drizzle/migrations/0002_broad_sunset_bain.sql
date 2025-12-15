PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_agents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '',
	`system_prompt` text DEFAULT '',
	`top_k` integer DEFAULT 40,
	`temperature` integer DEFAULT 70,
	`max_tokens` integer DEFAULT 1024,
	`llm_id` integer,
	`datasource_group_id` integer,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`llm_id`) REFERENCES `llms`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`datasource_group_id`) REFERENCES `datasource_groups`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_agents`("id", "name", "description", "system_prompt", "top_k", "temperature", "max_tokens", "llm_id", "datasource_group_id", "created_at", "updated_at") SELECT "id", "name", "description", "system_prompt", "top_k", "temperature", "max_tokens", "llm_id", "datasource_group_id", "created_at", "updated_at" FROM `agents`;--> statement-breakpoint
DROP TABLE `agents`;--> statement-breakpoint
ALTER TABLE `__new_agents` RENAME TO `agents`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_datasource_groups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '',
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
INSERT INTO `__new_datasource_groups`("id", "name", "description", "created_at", "updated_at") SELECT "id", "name", "description", "created_at", "updated_at" FROM `datasource_groups`;--> statement-breakpoint
DROP TABLE `datasource_groups`;--> statement-breakpoint
ALTER TABLE `__new_datasource_groups` RENAME TO `datasource_groups`;--> statement-breakpoint
CREATE TABLE `__new_llms` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '',
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`base_url` text NOT NULL,
	`api_key` text NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
INSERT INTO `__new_llms`("id", "name", "description", "provider", "model", "base_url", "api_key", "created_at", "updated_at") SELECT "id", "name", "description", "provider", "model", "base_url", "api_key", "created_at", "updated_at" FROM `llms`;--> statement-breakpoint
DROP TABLE `llms`;--> statement-breakpoint
ALTER TABLE `__new_llms` RENAME TO `llms`;