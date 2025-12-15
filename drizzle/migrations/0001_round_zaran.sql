CREATE TABLE `agents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '',
	`system_prompt` text DEFAULT '',
	`top_k` integer DEFAULT 40,
	`temperature` integer DEFAULT 70,
	`max_tokens` integer DEFAULT 1024,
	`llm_id` integer,
	`datasource_group_id` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`llm_id`) REFERENCES `llms`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`datasource_group_id`) REFERENCES `datasource_groups`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `datasource_groups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '',
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `datasources` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`content` text NOT NULL,
	`datasource_group_id` integer,
	FOREIGN KEY (`datasource_group_id`) REFERENCES `datasource_groups`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `llms` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '',
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`base_url` text NOT NULL,
	`api_key` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
