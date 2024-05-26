CREATE TABLE IF NOT EXISTS "devGames" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"devGamesTitle" varchar(36),
	"devGamesAuthor" varchar(48),
	"data" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "games" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(36),
	"desc" text,
	"author" varchar(48),
	"file" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "savedData" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author" varchar(48),
	"key" text,
	"value" text
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "titleIdx" ON "devGames" ("devGamesTitle");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "authorIdx" ON "devGames" ("devGamesAuthor");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "gamesTitleIdx" ON "games" ("title");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "gamesAuthorIdx" ON "games" ("author");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "keyIdx" ON "savedData" ("key");