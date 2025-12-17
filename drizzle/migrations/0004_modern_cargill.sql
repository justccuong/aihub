CREATE TABLE `ollama_keys` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text DEFAULT '',
	`key` text NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
