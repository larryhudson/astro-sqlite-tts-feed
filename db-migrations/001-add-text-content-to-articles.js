import Database from "better-sqlite3";
import path from "path";

const dbPath = path.resolve("articles.db");

const db = new Database(dbPath, {
  verbose: console.log,
});

db.pragma("journal_mode = WAL");

function applyMigration() {
  // Open the database

  try {
    // Prepare and run the ALTER TABLE statement
    const stmt = db.prepare(
      "ALTER TABLE articles ADD COLUMN text_content TEXT NULL",
    );
    stmt.run();

    console.log("Column text_content added successfully.");
  } catch (error) {
    console.error("Error altering database:", error.message);
  } finally {
    // Close the database
    db.close();
  }
}

applyMigration();
