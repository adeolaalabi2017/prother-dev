-- Indexes to eliminate full table scans for editor's picks, category-related tools, and directory browse pagination.
CREATE INDEX IF NOT EXISTS `tools_by_status_editors_pick` ON `tools` (`status`,`editors_pick`,`pinned`,`created_at`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `tools_by_status_category_related` ON `tools` (`status`,`category_id`,`editors_pick`,`created_at`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `tools_by_status_featured` ON `tools` (`status`,`pinned`,`editors_pick`,`curated`,`created_at`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `tools_by_status_created` ON `tools` (`status`,`created_at`);
