ALTER TABLE `site_settings` ADD `created_at` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `ad_serve_stats_placement_day_uq` ON `ad_serve_stats` (`placement`,`day`);--> statement-breakpoint
CREATE UNIQUE INDEX `comparisons_pair_uq` ON `comparisons` (`a_slug`,`b_slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `page_view_daily_path_day_uq` ON `page_view_daily` (`path`,`day`);