CREATE TABLE `outbox` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entity` text NOT NULL,
	`entity_id` text NOT NULL,
	`op` text NOT NULL,
	`payload` text,
	`created_at` integer NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`sent_at` integer,
	CONSTRAINT "outbox_entity" CHECK("outbox"."entity" in ('recording', 'segment')),
	CONSTRAINT "outbox_op" CHECK("outbox"."op" in ('create', 'update', 'trash', 'restore', 'purge', 'transcript'))
);
--> statement-breakpoint
CREATE TABLE `recordings` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`duration_ms` integer,
	`audio_path` text,
	`audio_size` integer,
	`audio_format` text,
	`sample_rate` integer DEFAULT 16000 NOT NULL,
	`recovered` integer DEFAULT false NOT NULL,
	`state` text NOT NULL,
	`state_error` text,
	`transcription_state` text DEFAULT 'none' NOT NULL,
	`transcription_progress` real,
	`transcription_issue` text,
	`language` text,
	`engine` text,
	`model` text,
	`quality` text,
	`sha256` text,
	`deleted_at` integer,
	`purged_at` integer,
	CONSTRAINT "recordings_state" CHECK("recordings"."state" in ('recording', 'local', 'queued', 'uploading', 'verifying', 'synced', 'error')),
	CONSTRAINT "recordings_transcription_state" CHECK("recordings"."transcription_state" in ('none', 'queued', 'transcribing', 'done', 'failed')),
	CONSTRAINT "recordings_transcription_issue" CHECK("recordings"."transcription_issue" is null or "recordings"."transcription_issue" in ('failed', 'model-missing', 'offline', 'quota-exhausted')),
	CONSTRAINT "recordings_audio_format" CHECK("recordings"."audio_format" is null or "recordings"."audio_format" in ('m4a', 'wav')),
	CONSTRAINT "recordings_quality" CHECK("recordings"."quality" is null or "recordings"."quality" in ('good', 'medium', 'draft')),
	CONSTRAINT "recordings_engine" CHECK("recordings"."engine" is null or "recordings"."engine" in ('local', 'cloud')),
	CONSTRAINT "recordings_progress" CHECK("recordings"."transcription_progress" is null or "recordings"."transcription_progress" between 0 and 1)
);
--> statement-breakpoint
CREATE INDEX `recordings_listing` ON `recordings` (`deleted_at`,`created_at`);--> statement-breakpoint
CREATE TABLE `segments` (
	`id` text PRIMARY KEY NOT NULL,
	`recording_id` text NOT NULL,
	`start_ms` integer NOT NULL,
	`end_ms` integer NOT NULL,
	`speaker` integer,
	`text` text NOT NULL,
	`search_text` text NOT NULL,
	FOREIGN KEY (`recording_id`) REFERENCES `recordings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `segments_by_recording` ON `segments` (`recording_id`,`start_ms`);