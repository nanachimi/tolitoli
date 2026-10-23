-- Title index only (owner, step 2): times and numeric dates stay one word ("10:23",
-- "23/10/2026"), so "23 oct" no longer finds 22 October at 10:23. Transcripts keep
-- segments_fts as it is: there, ":" and "/" must not glue two words together.
-- The table is rebuilt from the recordings at the next launch (titleIndexIsComplete).
DROP TABLE `recordings_fts`;
--> statement-breakpoint
CREATE VIRTUAL TABLE `recordings_fts` USING fts5(
	`title_search`,
	content='',
	contentless_delete=1,
	tokenize="unicode61 remove_diacritics 2 tokenchars ':/'"
);
