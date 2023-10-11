import { getRecordById, db } from "../src/utils/db.js";
import { extractChaptersFromDoc } from "../src/utils/extract-from-document.js";
import "dotenv/config";

export async function extractChaptersFromDocument({ documentId }) {
  const document = getRecordById("documents", documentId);
  const documentPath = document.filepath;

  const chapters = await extractChaptersFromDoc(documentPath);

  console.log("chapters");
  console.log(chapters);

  const createChapterStatement = db.prepare(`INSERT INTO document_chapters (
    document_id,
    title,
    text_content
  )
  VALUES (?, ?, ?)`);

  // TODO: probably not the best way to do this
  for (const chapter of chapters) {
    createChapterStatement.run(documentId, chapter.title, chapter.text_content);
  }

  return document;
}
