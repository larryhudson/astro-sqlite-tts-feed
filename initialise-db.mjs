import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const dbPath = path.resolve("articles.db");

const db = new Database(dbPath, {
  verbose: console.log,
});
db.pragma("journal_mode = WAL");

async function initialise() {
  // write sql for adding mp3Url column to the table

  const createArticlesTable = db.prepare(
    `CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      read_at TIMESTAMP NULL,
      added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      mp3Url TEXT NULL,
      mp3Duration TEXT NULL,
      mp3Length INTEGER NULL,
      status TEXT NULL,
      type TEXT NULL
    )`
  );
  createArticlesTable.run();
}

async function setMp3Length() {
  // get articles with mp3Url
  const articles = db
    .prepare(`SELECT * FROM articles WHERE mp3Url IS NOT NULL`)
    .all();

  // for each article, get the mp3 file size
  articles.forEach((article) => {
    const mp3Path = "./public" + article.mp3Url;
    const mp3Length = fs.statSync(mp3Path).size;
    // update the article with the mp3 file size
    const updateArticle = db.prepare(
      `UPDATE articles SET mp3Length = ? WHERE id = ?`
    );
    updateArticle.run(mp3Length, article.id);
  });
}

initialise();
