import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const dbFilePath = path.resolve("articles.db");

const db = new Database(dbFilePath, {
  verbose: console.log,
});
db.pragma("journal_mode = WAL");
db.pragma("encoding = 'UTF-8'");

export function createRecord(table, data) {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const placeholders = values.map(() => "?").join(", ");
  const statement = db.prepare(
    `INSERT INTO ${table} (${keys.join(", ")}) VALUES (${placeholders})`,
  );
  const result = statement.run(values);
  return result.lastInsertRowid;
}

function parseId(id) {
  const parsedId = parseInt(id);

  if (Number.isNaN(parsedId)) {
    throw new Error("Invalid ID. Please provide a valid integer ID.");
  }

  return parsedId;
}

export function getRecordById(table, id) {
  const parsedId = parseId(id);

  const statement = db.prepare(`SELECT * FROM ${table} WHERE id = ?`);

  return statement.get(parsedId);
}

export function executeQuery({ table, condition, limit, offset, orderBy }) {
  let whereClause = "";
  let limitClause = "";
  let offsetClause = "";
  let orderByClause = "";
  const values = [];

  if (condition) {
    const keys = Object.keys(condition);
    const conditions = keys.map((key) => {
      values.push(condition[key]);
      return `${key} = ?`;
    });

    whereClause = `WHERE ${conditions.join(" AND ")}`;
  }

  if (limit) {
    limitClause = `LIMIT ${limit}`;
  }

  if (offset) {
    offsetClause = `OFFSET ${offset}`;
  }

  if (orderBy) {
    orderByClause = `ORDER BY ${orderBy}`;
  }

  const query =
    `SELECT * FROM ${table} ${whereClause} ${limitClause} ${offsetClause} ${orderByClause}`.trim();
  const statement = db.prepare(query);
  return statement.all(values);
}

export function getArticles({ pageNum }) {
  const perPage = 10;
  const offset = perPage * pageNum;
  const articles = db
    .prepare("SELECT * FROM articles ORDER BY id DESC LIMIT ? OFFSET ?")
    .all(perPage, offset);
  return articles;
}

export function getArticlesWithMp3Url() {
  const articles = db
    .prepare("SELECT * FROM articles WHERE mp3Url IS NOT NULL")
    .all();
  return articles;
}

export function getArticleFromDb(id) {
  const article = getRecordById("articles", id);
  return article;
}

export function createArticleInDb({
  title,
  url,
  mp3Url,
  mp3Duration,
  mp3Length,
}) {
  const createdArticleId = createRecord("articles", {
    title,
    url,
    mp3Url,
    mp3Duration,
    mp3Length,
  });
  return createdArticleId;
}

export function updateRecord(table, id, data) {
  const parsedId = parseId(id);

  const keys = Object.keys(data);
  const values = Object.values(data);
  const placeholders = keys.map((key) => `${key} = ?`).join(", ");
  const statement = db.prepare(
    `UPDATE ${table} SET ${placeholders} WHERE id = ?`,
  );
  const result = statement.run([...values, parsedId]);
  return result.changes > 0;
}

export function updateArticleInDb(id, columnsToUpdate) {
  const updated = updateRecord("articles", id, columnsToUpdate);

  if (updated) {
    console.log(`Article with ID ${id} updated successfully.`);
  } else {
    console.log(`No article found with ID ${id}.`);
  }
}

export function deleteRecordById(table, id) {
  const parsedId = parseId(id);

  const statement = db.prepare(`DELETE FROM ${table} WHERE id = ?`);
  const result = statement.run(parsedId);
  return result.changes > 0;
}

export function deleteArticleFromDb(id) {
  const article = getRecordById("articles", id);

  const mp3Url = article.mp3Url;
  if (mp3Url) {
    const mp3FilePath = mp3Url.slice(1);

    const mp3PathExists = fs.existsSync(mp3FilePath);
    if (mp3PathExists) {
      // delete the file
      fs.unlinkSync(mp3FilePath);
      console.log(`Deleted mp3 file at ${mp3FilePath}`);
    } else {
      console.log(`No mp3 file found at ${mp3FilePath}`);
    }
  }

  const deleted = deleteRecordById("articles", id);

  if (deleted) {
    console.log(`Article with ID ${id} deleted successfully.`);
    return true;
  } else {
    console.log(`No article found with ID ${id}.`);
    throw new Error(`No article found with ID ${id}.`);
  }
}

export function getExtractionRulesFromDb() {
  const extractionRules = executeQuery({ table: "extraction_rules" });
  return extractionRules;
}

export function getExtractionRuleFromDb(id) {
  return getRecordById("extraction_rules", id);
}

export function getExtractionRulesForDomain(domain) {
  // TODO: this is a bit messy.
  const query =
    domain === null
      ? "SELECT * FROM extraction_rules WHERE is_active = 1 AND (domain IS ? OR domain = '')"
      : "SELECT * FROM extraction_rules WHERE is_active = 1 AND domain = ?";
  const extractionRules = db.prepare(query).all(domain);
  return extractionRules;
}

export function createExtractionRule({
  domain,
  is_active,
  title,
  rule_type,
  content,
}) {
  const createdRuleId = createRecord("extraction_rules", {
    domain,
    is_active,
    title,
    rule_type,
    content,
  });
  return createdRuleId;
}

export function deleteExtractionRule(id) {
  const deleted = deleteRecordById("extraction_rules", id);
  if (deleted) {
    console.log(`Extraction rule with ID ${id} deleted successfully.`);
    return true;
  } else {
    console.log(`No extraction rule found with ID ${id}.`);
    throw new Error(`No extraction rule found with ID ${id}.`);
  }
}

export function updateExtractionRuleInDb(id, columnsToUpdate) {
  const updated = updateRecord("extraction_rules", id, columnsToUpdate);

  if (updated) {
    console.log(`Extraction rule with ID ${id} updated successfully.`);
  } else {
    console.log(`No extraction rule found with ID ${id}.`);
  }
}

export function getRelatedLinksForArticle(articleId) {
  const relatedLinks = executeQuery({
    table: "related_links",
    condition: { article_id: articleId },
  });

  return relatedLinks;
}

export function deleteRelatedLinksForArticle(articleId) {
  const deleteStatement = db.prepare(
    `DELETE FROM related_links WHERE article_id = ?`,
  );
  deleteStatement.run(articleId);

  console.log(`Deleted related links for article with ID ${articleId}`);
}

export function findParentArticleFromArticleId(articleId) {
  const relatedLinksWithThisArticleId = executeQuery({
    table: "related_links",
    condition: {
      own_article_id: articleId,
    },
  });
  if (relatedLinksWithThisArticleId.length === 0) return null;
  const relatedLink = relatedLinksWithThisArticleId[0];
  const parentArticleId = relatedLink.article_id;
  return getRecordById("articles", parentArticleId);
}
