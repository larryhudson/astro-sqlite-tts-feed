import { getArticleFromDb, updateArticleInDb } from "../src/utils/db.js";
import { extractArticle } from "../src/utils/extract-article.js";
import "dotenv/config";
import { Queue } from "bullmq";

export async function extractTextFromUrl({ articleId, shouldGenerateAudio }) {
  const articleData = getArticleFromDb(articleId);

  const articleChapters = await extractArticle(articleData.url);

  const markdownContent = articleChapters
    .map((c) => {
      const { title, text } = c;
      return `## ${title}\n\n${text}`;
    })
    .join("\n\n");

  const articleInDb = updateArticleInDb(articleId, {
    text_content: markdownContent,
  });

  if (shouldGenerateAudio) {
    const taskQueue = new Queue("taskQueue", {
      connection: { host: "127.0.0.1", port: 6379 },
    });
    taskQueue.add("convertTextToSpeech", { articleId: articleId });
  }

  return articleInDb;
}
