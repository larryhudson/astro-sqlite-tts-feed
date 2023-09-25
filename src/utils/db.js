import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
// Having trouble with the path to the DB file.
// will need to try to work out how to figure out the project root path
// Eg: https://stackoverflow.com/questions/10265798/determine-project-root-from-a-running-node-js-application

const dbFilePath = path.resolve("articles.db");

const db = new Database(dbFilePath, {
  verbose: console.log,
});
db.pragma("journal_mode = WAL");

export function getArticles() {
  const articles = db.prepare("SELECT * FROM articles").all();
  return articles;
}

export function getArticlesWithMp3Url() {
  const articles = db
    .prepare("SELECT * FROM articles WHERE mp3Url IS NOT NULL")
    .all();
  return articles;
}

export function getArticleFromDb(id) {
  const article = db.prepare("SELECT * FROM articles WHERE id = ?").get(id);
  return article;
}

export function createArticleInDb({
  title,
  url,
  mp3Url,
  mp3Duration,
  mp3Length,
}) {
  const createArticleStatement = db.prepare(
    "INSERT INTO articles (title, url, mp3Url, mp3Duration, mp3Length) VALUES (?, ?, ?, ?, ?)",
  );
  const result = createArticleStatement.run(
    title,
    url,
    mp3Url,
    mp3Duration,
    mp3Length,
  );
  const createdArticleId = result.lastInsertRowid;
  return createdArticleId;
}

export function updateArticleInDb(id, columnsToUpdate) {
  const columnNames = Object.keys(columnsToUpdate);
  const columnValues = Object.values(columnsToUpdate);

  const updateStatement = db.prepare(`
    UPDATE articles
    SET ${columnNames.map((columnName) => `${columnName} = ?`).join(", ")}
    WHERE id = ?
  `);

  const result = updateStatement.run([...columnValues, id]);

  if (result.changes > 0) {
    console.log(`Article with ID ${id} updated successfully.`);
  } else {
    console.log(`No article found with ID ${id}.`);
  }
}

export function deleteArticleFromDb(id) {
  const lookupStatement = db.prepare("SELECT * FROM articles WHERE id = ?");
  const article = lookupStatement.get(id);

  const mp3Url = article.mp3Url;
  const mp3FilePath = mp3Url.slice(1);

  const mp3PathExists = fs.existsSync(mp3FilePath);
  if (mp3PathExists) {
    // delete the file
    fs.unlinkSync(mp3FilePath);
    console.log(`Deleted mp3 file at ${mp3FilePath}`);
  } else {
    console.log(`No mp3 file found at ${mp3FilePath}`);
  }

  const deleteStatement = db.prepare("DELETE FROM articles WHERE id = ?");
  const result = deleteStatement.run(id);
  if (result.changes > 0) {
    console.log(`Article with ID ${id} deleted successfully.`);
    return true;
  } else {
    console.log(`No article found with ID ${id}.`);
    throw new Error(`No article found with ID ${id}.`);
  }
}
