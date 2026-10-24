-- Traffic sources (referrer host × coarse device × day) + search demand.
CREATE TABLE `pv_source_daily` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`device` text NOT NULL,
	`day` text NOT NULL,
	`views` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pv_source_daily_uq` ON `pv_source_daily` (`source`,`device`,`day`);
--> statement-breakpoint
CREATE INDEX `pv_source_daily_by_day_source_device` ON `pv_source_daily` (`day`,`source`,`device`);
--> statement-breakpoint
CREATE INDEX `pv_source_daily_by_day` ON `pv_source_daily` (`day`);
--> statement-breakpoint
CREATE TABLE `search_daily` (
	`id` text PRIMARY KEY NOT NULL,
	`query` text NOT NULL,
	`day` text NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	`zero_count` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `search_daily_query_day_uq` ON `search_daily` (`query`,`day`);
--> statement-breakpoint
CREATE INDEX `search_daily_by_day_query` ON `search_daily` (`day`,`query`);
--> statement-breakpoint
CREATE INDEX `search_daily_by_day` ON `search_daily` (`day`);
