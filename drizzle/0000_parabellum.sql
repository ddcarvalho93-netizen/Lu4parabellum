CREATE TABLE `app_state` (
  `id` integer PRIMARY KEY NOT NULL,
  `version` integer DEFAULT 1 NOT NULL,
  `payload` text NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `audit_log` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `version` integer NOT NULL,
  `actor` text NOT NULL,
  `action` text NOT NULL,
  `summary` text NOT NULL,
  `snapshot` text NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_audit_log_version` ON `audit_log` (`version`);
