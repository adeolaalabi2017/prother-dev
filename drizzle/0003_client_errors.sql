-- Client-side runtime error counters.
CREATE TABLE `error_daily` (
	`id` text PRIMARY KEY NOT NULL,
	`sig` text NOT NULL,
	`day` text NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `error_daily_sig_day_uq` ON `error_daily` (`sig`,`day`);
--> statement-breakpoint
CREATE INDEX `error_daily_by_day_sig` ON `error_daily` (`day`,`sig`);
--> statement-breakpoint
CREATE INDEX `error_daily_by_day` ON `error_daily` (`day`);
