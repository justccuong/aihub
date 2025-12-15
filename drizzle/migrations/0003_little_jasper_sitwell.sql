CREATE TABLE `agent_datasource_groups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`agent_id` integer NOT NULL,
	`datasource_group_id` integer NOT NULL,
	`created_at` integer,
	FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`datasource_group_id`) REFERENCES `datasource_groups`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
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
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`llm_id`) REFERENCES `llms`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_agents`("id", "name", "description", "system_prompt", "top_k", "temperature", "max_tokens", "llm_id", "created_at", "updated_at") SELECT "id", "name", "description", "system_prompt", "top_k", "temperature", "max_tokens", "llm_id", "created_at", "updated_at" FROM `agents`;--> statement-breakpoint
DROP TABLE `agents`;--> statement-breakpoint
ALTER TABLE `__new_agents` RENAME TO `agents`;--> statement-breakpoint
PRAGMA foreign_keys=ON;