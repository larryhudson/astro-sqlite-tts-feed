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
      type TEXT NULL,
      text_content TEXT NULL
    )`,
  );

  console.log("Creating articles table");
  createArticlesTable.run();

  const createExtractionRulesTable = db.prepare(
    `CREATE TABLE IF NOT EXISTS extraction_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      is_active INTEGER NOT NULL DEFAULT 1,
      title TEXT NOT NULL,
      domain TEXT NULL,
      added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      rule_type TEXT NOT NULL DEFAULT 'delete_selector',
      content TEXT NOT NULL
      )`,
  );

  console.log("Creating extraction rules table");
  createExtractionRulesTable.run();

  const extractionRulesQuery = db.prepare(
    `SELECT count(*) FROM extraction_rules`,
  );

  const extractionRulesCount = extractionRulesQuery.get();

  if (extractionRulesCount["count(*)"] === 0) {
    console.log("Adding default extraction rules");
    addDefaultExtractionRules();
  }
}

function addDefaultExtractionRules() {
  const wikipediaSelectors = [
    "figure",
    "img",
    "figcaption",
    "sup.reference",
    "sup.noprint",
    "div.thumb",
    "table.infobox",
    "ol.references",
    ".mw-editsection",
  ];

  const createRuleStatement = db.prepare(
    "INSERT INTO extraction_rules (domain, is_active, title, rule_type, content) VALUES (?, ?, ?, ?, ?)",
  );

  for (const selector of wikipediaSelectors) {
    createRuleStatement.run(
      "en.wikipedia.org",
      1,
      `Remove ${selector} from Wikipedia`,
      "delete_selector",
      selector,
    );
  }
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
      `UPDATE articles SET mp3Length = ? WHERE id = ?`,
    );
    updateArticle.run(mp3Length, article.id);
  });
}

initialise();
