import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const dbPath = path.resolve("articles.db");

const db = new Database(dbPath, {
  verbose: console.log,
});
db.pragma("journal_mode = WAL");

function checkIfTableExists(tableName) {
  const tableExistsStatement = db.prepare(
    `SELECT name FROM sqlite_master WHERE type='table' AND name = ?;`,
  );

  const tableExistsResult = tableExistsStatement.get(tableName);

  return tableExistsResult !== undefined;
}

async function initialise() {
  const creatingFeedsTable = !checkIfTableExists("feeds");

  if (creatingFeedsTable) {
    const createFeedsTable = db.prepare(
      `CREATE TABLE IF NOT EXISTS feeds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL
  );`,
    );

    createFeedsTable.run();

    console.log("Creating default feed");
    const insertDefaultFeed = db.prepare(
      `INSERT INTO feeds (title) VALUES (?)`,
    );

    insertDefaultFeed.run("Default");
  }

  const createArticlesTable = db.prepare(
    `CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      feed_id INTEGER,
      read_at TIMESTAMP NULL,
      added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      mp3Url TEXT NULL,
      mp3Duration TEXT NULL,
      mp3Length INTEGER NULL,
      status TEXT NULL,
      type TEXT NULL,
      text_content TEXT NULL,
      bullmq_job_id INTEGER NULL,
      FOREIGN KEY (feed_id) REFERENCES feeds(id)
    )`,
  );

  console.log("Creating articles table");
  createArticlesTable.run();

  if (creatingFeedsTable) {
    console.log("Setting feed_id for all articles to 1");
    // set all articles to the default feed
    const updateArticlesFeedId = db.prepare(`UPDATE articles SET feed_id = 1`);

    updateArticlesFeedId.run();
  }

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

  const createRelatedLinksTable = db.prepare(
    `CREATE TABLE IF NOT EXISTS related_links (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        article_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        url TEXT NOT NULL,
        context_quote TEXT NULL,
        added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        own_article_id INTEGER NULL,
        FOREIGN KEY (article_id) REFERENCES articles(id),
        FOREIGN KEY (own_article_id) REFERENCES articles(id)
    )
    `,
  );

  console.log("Creating related links table");
  createRelatedLinksTable.run();

  const createDocumentsTable = db.prepare(
    `CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        filename TEXT NOT NULL,
        filepath TEXT NOT NULL,
        document_type TEXT NOT NULL,
        added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        bullmq_job_id INTEGER NULL
    )
    `,
  );

  console.log("Creating documents table");
  createDocumentsTable.run();

  const createDocumentChaptersTable = db.prepare(
    `CREATE TABLE IF NOT EXISTS document_chapters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        document_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        chapter_number INTEGER NULL,
        text_content TEXT NULL,
        added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        own_article_id INTEGER NULL,
        FOREIGN KEY (document_id) REFERENCES documents(id),
        FOREIGN KEY (own_article_id) REFERENCES articles(id)
    )
    `,
  );

  console.log("Creating document chapters table");
  createDocumentChaptersTable.run();
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
