import {
  getArticleFromDb,
  updateArticleInDb,
  createRecord,
  deleteRelatedLinksForArticle,
} from "../src/utils/db.js";
import { extractArticle } from "../src/utils/extract-article.js";
import "dotenv/config";
import { Queue } from "bullmq";

export async function extractTextFromUrl({
  articleId,
  shouldGenerateAudio,
  shouldAddRelatedLinks,
}) {
  const articleData = getArticleFromDb(articleId);

  const { articleChapters, relatedLinks } = await extractArticle(
    articleData.url,
  );

  const markdownContent = articleChapters
    .map((c) => {
      const { title, text } = c;
      return `## ${title}\n\n${text}`;
    })
    .join("\n\n");

  const articleInDb = updateArticleInDb(articleId, {
    text_content: markdownContent,
  });

  if (shouldAddRelatedLinks) {
    // find existing related links
    deleteRelatedLinksForArticle(articleId);
    // add related links to db
    for (const relatedLink of relatedLinks) {
      const { title, url, contextQuote } = relatedLink;

      createRecord("related_links", {
        article_id: articleId,
        title,
        url,
        context_quote: contextQuote,
      });
    }
  }

  if (shouldGenerateAudio) {
    const taskQueue = new Queue("taskQueue", {
      connection: { host: "127.0.0.1", port: 6379 },
    });
    taskQueue.add("convertTextToSpeech", { articleId: articleId });
  }

  return articleInDb;
}
