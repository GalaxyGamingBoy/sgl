import { index, pgTable, text, uuid, varchar } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

export const games = pgTable(
  "games",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    title: varchar("title", { length: 36 }),
    desc: text("desc"),
    author: varchar("author", { length: 48 }),
    file: text("file"),
  },
  (games) => {
    return {
      titleIndex: index("gamesTitleIdx").on(games.title),
      authorIndex: index("gamesAuthorIdx").on(games.author),
    };
  },
);

export const devGames = pgTable(
  "devGames",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    title: varchar("devGamesTitle", { length: 36 }),
    author: varchar("devGamesAuthor", { length: 48 }),
    data: text("data"),
  },
  (games) => {
    return {
      titleIndex: index("titleIdx").on(games.title),
      authorIndex: index("authorIdx").on(games.author),
    };
  },
);

export const savedData = pgTable(
  "savedData",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    author: varchar("author", { length: 48 }),
    key: text("key"),
    value: text("value"),
  },
  (savedData) => {
    return {
      keyIndex: index("keyIdx").on(savedData.key),
    };
  },
);

export const devGamesRelations = relations(devGames, ({ one }) => ({
  published: one(games),
}));

export const gamesRelations = relations(games, ({ one }) => ({
  source: one(devGames),
}));

export const savedDataRelations = relations(savedData, ({ many }) => ({
  origin: many(games),
}));
