CREATE TABLE `ad_campaigns` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`advertiser` text NOT NULL,
	`placement` text NOT NULL,
	`status` text NOT NULL,
	`headline` text NOT NULL,
	`body` text NOT NULL,
	`click_url` text NOT NULL,
	`emoji` text NOT NULL,
	`gradient` text NOT NULL,
	`target_category` text,
	`weight` integer NOT NULL,
	`starts_at` integer,
	`ends_at` integer,
	`total_budget_cents` integer NOT NULL,
	`daily_budget_cents` integer NOT NULL,
	`impressions` integer DEFAULT 0 NOT NULL,
	`clicks` integer DEFAULT 0 NOT NULL,
	`viewable_impressions` integer DEFAULT 0 NOT NULL,
	`legacy_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ad_campaigns_by_placement_status` ON `ad_campaigns` (`placement`,`status`);--> statement-breakpoint
CREATE TABLE `ad_serve_stats` (
	`id` text PRIMARY KEY NOT NULL,
	`placement` text NOT NULL,
	`day` text NOT NULL,
	`served` integer DEFAULT 0 NOT NULL,
	`house` integer DEFAULT 0 NOT NULL,
	`unfilled` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ad_serve_stats_by_placement_day` ON `ad_serve_stats` (`placement`,`day`);--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`action` text NOT NULL,
	`entity` text NOT NULL,
	`entity_id` text NOT NULL,
	`meta` text NOT NULL,
	`actor` text,
	`legacy_id` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `audit_logs_by_created` ON `audit_logs` (`created_at`);--> statement-breakpoint
CREATE TABLE `auth_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_legacy_id` text NOT NULL,
	`type` text NOT NULL,
	`provider` text NOT NULL,
	`provider_account_id` text NOT NULL,
	`refresh_token` text,
	`access_token` text,
	`expires_at` integer,
	`token_type` text,
	`scope` text,
	`id_token` text,
	`session_state` text
);
--> statement-breakpoint
CREATE INDEX `auth_accounts_by_provider_account` ON `auth_accounts` (`provider`,`provider_account_id`);--> statement-breakpoint
CREATE INDEX `auth_accounts_by_user` ON `auth_accounts` (`user_legacy_id`);--> statement-breakpoint
CREATE TABLE `auth_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`session_token` text NOT NULL,
	`user_legacy_id` text NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `auth_sessions_by_token` ON `auth_sessions` (`session_token`);--> statement-breakpoint
CREATE INDEX `auth_sessions_by_user` ON `auth_sessions` (`user_legacy_id`);--> statement-breakpoint
CREATE TABLE `auth_verification_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`token` text NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `auth_vt_by_token` ON `auth_verification_tokens` (`token`);--> statement-breakpoint
CREATE INDEX `auth_vt_by_identifier_token` ON `auth_verification_tokens` (`identifier`,`token`);--> statement-breakpoint
CREATE TABLE `bookmarks` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_key` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`target_label` text NOT NULL,
	`target_href` text NOT NULL,
	`legacy_id` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `bookmarks_by_owner_created` ON `bookmarks` (`owner_key`);--> statement-breakpoint
CREATE INDEX `bookmarks_by_triple` ON `bookmarks` (`owner_key`,`target_type`,`target_id`);--> statement-breakpoint
CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`emoji` text NOT NULL,
	`sort_order` integer NOT NULL,
	`features_json` text DEFAULT '[]' NOT NULL,
	`legacy_id` text
);
--> statement-breakpoint
CREATE INDEX `categories_by_slug` ON `categories` (`slug`);--> statement-breakpoint
CREATE TABLE `claims` (
	`id` text PRIMARY KEY NOT NULL,
	`tool_id` text NOT NULL,
	`user_email` text NOT NULL,
	`user_name` text NOT NULL,
	`method` text NOT NULL,
	`token` text NOT NULL,
	`status` text NOT NULL,
	`note` text,
	`verified_at` integer,
	`legacy_id` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `claims_by_token` ON `claims` (`token`);--> statement-breakpoint
CREATE INDEX `claims_by_tool` ON `claims` (`tool_id`);--> statement-breakpoint
CREATE TABLE `collection_items` (
	`id` text PRIMARY KEY NOT NULL,
	`collection_id` text NOT NULL,
	`tool_id` text NOT NULL,
	`position` integer NOT NULL,
	`legacy_id` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `collection_items_by_collection` ON `collection_items` (`collection_id`);--> statement-breakpoint
CREATE INDEX `collection_items_by_collection_tool` ON `collection_items` (`collection_id`,`tool_id`);--> statement-breakpoint
CREATE TABLE `collections` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`is_public` integer DEFAULT 0 NOT NULL,
	`owner_email` text NOT NULL,
	`owner_name` text NOT NULL,
	`legacy_id` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `collections_by_slug` ON `collections` (`slug`);--> statement-breakpoint
CREATE INDEX `collections_by_owner` ON `collections` (`owner_email`);--> statement-breakpoint
CREATE TABLE `comments` (
	`id` text PRIMARY KEY NOT NULL,
	`tool_id` text NOT NULL,
	`author` text NOT NULL,
	`body` text NOT NULL,
	`is_maker` integer DEFAULT 0 NOT NULL,
	`legacy_id` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `comments_by_tool_created` ON `comments` (`tool_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `comparisons` (
	`id` text PRIMARY KEY NOT NULL,
	`a_slug` text NOT NULL,
	`b_slug` text NOT NULL,
	`views` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `comparisons_by_pair` ON `comparisons` (`a_slug`,`b_slug`);--> statement-breakpoint
CREATE INDEX `comparisons_by_views` ON `comparisons` (`views`);--> statement-breakpoint
CREATE TABLE `follows` (
	`id` text PRIMARY KEY NOT NULL,
	`user_email` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`target_label` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `follows_by_owner` ON `follows` (`user_email`);--> statement-breakpoint
CREATE INDEX `follows_by_triple` ON `follows` (`user_email`,`target_type`,`target_id`);--> statement-breakpoint
CREATE TABLE `forum_replies` (
	`id` text PRIMARY KEY NOT NULL,
	`thread_id` text NOT NULL,
	`author` text NOT NULL,
	`author_id` text,
	`body` text NOT NULL,
	`hidden` integer DEFAULT 0 NOT NULL,
	`legacy_id` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `forum_replies_by_thread_created` ON `forum_replies` (`thread_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `forum_thread_votes` (
	`id` text PRIMARY KEY NOT NULL,
	`thread_id` text NOT NULL,
	`voter_key` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `forum_thread_votes_by_thread_voter` ON `forum_thread_votes` (`thread_id`,`voter_key`);--> statement-breakpoint
CREATE TABLE `forum_threads` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`topic` text NOT NULL,
	`author` text NOT NULL,
	`author_id` text,
	`pinned` integer DEFAULT 0 NOT NULL,
	`hidden` integer DEFAULT 0 NOT NULL,
	`base_upvotes` integer DEFAULT 0 NOT NULL,
	`reply_count` integer DEFAULT 0 NOT NULL,
	`vote_count` integer DEFAULT 0 NOT NULL,
	`legacy_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `forum_threads_by_slug` ON `forum_threads` (`slug`);--> statement-breakpoint
CREATE INDEX `forum_threads_by_topic_created` ON `forum_threads` (`topic`,`created_at`);--> statement-breakpoint
CREATE INDEX `forum_threads_by_created` ON `forum_threads` (`created_at`);--> statement-breakpoint
CREATE TABLE `integrations` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`enabled` integer DEFAULT 0 NOT NULL,
	`config_json` text NOT NULL,
	`notes` text NOT NULL,
	`legacy_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `integrations_by_key` ON `integrations` (`key`);--> statement-breakpoint
CREATE TABLE `media` (
	`id` text PRIMARY KEY NOT NULL,
	`storage_key` text,
	`kind` text NOT NULL,
	`mime_type` text NOT NULL,
	`size` integer NOT NULL,
	`original_name` text NOT NULL,
	`stored_name` text,
	`width` integer,
	`height` integer,
	`purpose` text NOT NULL,
	`owner_key` text NOT NULL,
	`legacy_id` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `media_by_kind_created` ON `media` (`kind`);--> statement-breakpoint
CREATE INDEX `media_by_purpose_created` ON `media` (`purpose`);--> statement-breakpoint
CREATE TABLE `page_view_daily` (
	`id` text PRIMARY KEY NOT NULL,
	`path` text NOT NULL,
	`day` text NOT NULL,
	`views` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `page_view_daily_by_path_day` ON `page_view_daily` (`path`,`day`);--> statement-breakpoint
CREATE INDEX `page_view_daily_by_day` ON `page_view_daily` (`day`);--> statement-breakpoint
CREATE TABLE `posts` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`excerpt` text NOT NULL,
	`body` text NOT NULL,
	`cover_emoji` text NOT NULL,
	`cover_gradient` text NOT NULL,
	`cover_url` text,
	`category` text NOT NULL,
	`tags_json` text DEFAULT '[]' NOT NULL,
	`status` text NOT NULL,
	`author` text NOT NULL,
	`reading_minutes` integer NOT NULL,
	`views` integer DEFAULT 0 NOT NULL,
	`seo_title` text,
	`seo_description` text,
	`keywords` text,
	`published_at` integer,
	`legacy_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `posts_by_slug` ON `posts` (`slug`);--> statement-breakpoint
CREATE INDEX `posts_by_status` ON `posts` (`status`);--> statement-breakpoint
CREATE TABLE `reports` (
	`id` text PRIMARY KEY NOT NULL,
	`reporter_email` text,
	`reporter_key` text,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`target_label` text NOT NULL,
	`reason` text NOT NULL,
	`details` text,
	`status` text NOT NULL,
	`resolution_note` text,
	`resolved_at` integer,
	`legacy_id` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `reports_by_status_created` ON `reports` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `reports_by_target` ON `reports` (`target_type`,`target_id`);--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`tool_id` text NOT NULL,
	`user_id` text NOT NULL,
	`author` text NOT NULL,
	`ease` integer NOT NULL,
	`power` integer NOT NULL,
	`value` integer NOT NULL,
	`body` text NOT NULL,
	`status` text NOT NULL,
	`legacy_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `reviews_by_tool_status` ON `reviews` (`tool_id`,`status`);--> statement-breakpoint
CREATE INDEX `reviews_by_tool_user` ON `reviews` (`tool_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `site_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer
);
--> statement-breakpoint
CREATE INDEX `site_settings_by_key` ON `site_settings` (`key`);--> statement-breakpoint
CREATE TABLE `submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`website_url` text NOT NULL,
	`domain` text NOT NULL,
	`name` text NOT NULL,
	`tagline` text NOT NULL,
	`description` text NOT NULL,
	`category_slug` text NOT NULL,
	`tags_json` text DEFAULT '[]' NOT NULL,
	`pricing_model` text NOT NULL,
	`starting_price` text,
	`pricing_note` text,
	`has_api` integer DEFAULT 0 NOT NULL,
	`github_url` text,
	`docs_url` text,
	`twitter_url` text,
	`logo_emoji` text NOT NULL,
	`logo_gradient` text NOT NULL,
	`is_owner` integer DEFAULT 0 NOT NULL,
	`confirmed_live` integer DEFAULT 0 NOT NULL,
	`agreed_standards` integer DEFAULT 0 NOT NULL,
	`status` text NOT NULL,
	`review_note` text,
	`legacy_id` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `submissions_by_email` ON `submissions` (`email`);--> statement-breakpoint
CREATE INDEX `submissions_by_status_created` ON `submissions` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `submissions_by_domain` ON `submissions` (`domain`);--> statement-breakpoint
CREATE TABLE `tools` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`tagline` text NOT NULL,
	`description` text,
	`website_url` text NOT NULL,
	`logo_emoji` text NOT NULL,
	`logo_gradient` text NOT NULL,
	`logo_url` text,
	`screenshot_urls_json` text DEFAULT '[]' NOT NULL,
	`long_description` text,
	`use_cases_json` text DEFAULT '[]' NOT NULL,
	`pros_json` text DEFAULT '[]' NOT NULL,
	`cons_json` text DEFAULT '[]' NOT NULL,
	`alternatives_json` text DEFAULT '[]' NOT NULL,
	`pricing_checked_at` integer,
	`content_updated_at` integer,
	`pricing_model` text NOT NULL,
	`starting_price` text,
	`pricing_note` text,
	`has_api` integer DEFAULT 0 NOT NULL,
	`github_url` text,
	`docs_url` text,
	`twitter_url` text,
	`tags_json` text DEFAULT '[]' NOT NULL,
	`features_json` text DEFAULT '{}' NOT NULL,
	`maker_email` text,
	`track` text NOT NULL,
	`editors_pick` integer DEFAULT 0 NOT NULL,
	`curated` integer DEFAULT 0 NOT NULL,
	`claimed` integer DEFAULT 0 NOT NULL,
	`maker_handle` text NOT NULL,
	`status` text NOT NULL,
	`pinned` integer NOT NULL,
	`verified_at` integer,
	`category_id` text NOT NULL,
	`submission_id` text,
	`comment_count` integer DEFAULT 0 NOT NULL,
	`review_count` integer DEFAULT 0 NOT NULL,
	`rating_sum_x100` integer DEFAULT 0 NOT NULL,
	`legacy_id` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `tools_by_slug` ON `tools` (`slug`);--> statement-breakpoint
CREATE INDEX `tools_by_status_category` ON `tools` (`status`,`category_id`);--> statement-breakpoint
CREATE INDEX `tools_by_category_featured` ON `tools` (`category_id`,`pinned`,`editors_pick`);--> statement-breakpoint
CREATE INDEX `tools_by_submission` ON `tools` (`submission_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text,
	`name` text,
	`handle` text,
	`image` text,
	`bio` text,
	`cover_image` text,
	`role` text NOT NULL,
	`status` text NOT NULL,
	`email_verified` integer,
	`external_auth_id` text,
	`legacy_id` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `users_by_email` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `users_by_handle` ON `users` (`handle`);--> statement-breakpoint
CREATE INDEX `users_by_external_auth` ON `users` (`external_auth_id`);