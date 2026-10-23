-- Full-text search (docs/plans/step-2.md, « Recherche »). Text is folded in TypeScript by
-- foldForSearch before it reaches these indexes; unicode61 also strips what remains of the
-- combining marks. Chinese has no spaces, so queries with ideographs use LIKE instead (D-036).
CREATE VIRTUAL TABLE `segments_fts` USING fts5(
	`search_text`,
	content='segments',
	content_rowid='rowid',
	tokenize='unicode61 remove_diacritics 2'
);
--> statement-breakpoint
CREATE TRIGGER `segments_fts_insert` AFTER INSERT ON `segments` BEGIN
	INSERT INTO `segments_fts` (rowid, `search_text`) VALUES (new.rowid, new.`search_text`);
END;
--> statement-breakpoint
CREATE TRIGGER `segments_fts_delete` AFTER DELETE ON `segments` BEGIN
	INSERT INTO `segments_fts` (`segments_fts`, rowid, `search_text`) VALUES ('delete', old.rowid, old.`search_text`);
END;
--> statement-breakpoint
CREATE TRIGGER `segments_fts_update` AFTER UPDATE OF `search_text` ON `segments` BEGIN
	INSERT INTO `segments_fts` (`segments_fts`, rowid, `search_text`) VALUES ('delete', old.rowid, old.`search_text`);
	INSERT INTO `segments_fts` (rowid, `search_text`) VALUES (new.rowid, new.`search_text`);
END;
--> statement-breakpoint
-- Titles: no external content, so nothing cleans it by itself. The repository writes and
-- deletes its rows (rowid = recordings.rowid) in the same transaction as the recording.
CREATE VIRTUAL TABLE `recordings_fts` USING fts5(
	`title_search`,
	content='',
	contentless_delete=1,
	tokenize='unicode61 remove_diacritics 2'
);
