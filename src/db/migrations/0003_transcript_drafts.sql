CREATE TABLE `transcript_drafts` (
	`recording_id` text NOT NULL,
	`idx` integer NOT NULL,
	`start_ms` integer NOT NULL,
	`end_ms` integer NOT NULL,
	`text` text NOT NULL,
	PRIMARY KEY(`recording_id`, `idx`),
	FOREIGN KEY (`recording_id`) REFERENCES `recordings`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "transcript_drafts_span" CHECK("transcript_drafts"."start_ms" >= 0 and "transcript_drafts"."end_ms" >= "transcript_drafts"."start_ms")
);
--> statement-breakpoint
ALTER TABLE `recordings` ADD `transcription_cursor_ms` integer;