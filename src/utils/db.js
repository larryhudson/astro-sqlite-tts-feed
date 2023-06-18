import Database from "better-sqlite3";

// Having trouble with the path to the DB file.
// will need to try to work out how to figure out the project root path
// Eg: https://stackoverflow.com/questions/10265798/determine-project-root-from-a-running-node-js-application

const db = new Database("articles.db", {
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

export function getArticle(id) {
  const article = db.prepare("SELECT * FROM articles WHERE id = ?").get(id);
  return article;
}

export function createArticleInDb({title, url, mp3Url, mp3Duration, mp3Length}) {
  const createArticleStatement = db.prepare(
    "INSERT INTO articles (title, url, mp3Url, mp3Duration, mp3Length) VALUES (?, ?, ?, ?, ?)"
  );
  return createArticleStatement.run(title, url, mp3Url, mp3Duration, mp3Length);
}

export function updateArticle(id, title, url, mp3Url) {
  const updateArticleStatement = db.prepare(
    "UPDATE articles SET title = ?, url = ?, mp3Url = ? WHERE id = ?"
  );
  return updateArticleStatement.run(title, url, mp3Url, id);
}
