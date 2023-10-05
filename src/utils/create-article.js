import { createArticleInDb } from "@src/utils/db";
import taskQueue from "@src/utils/task-queue";
import { checkIfUrlIsSupported, getContentMetadata } from "@src/utils/yt-dlp";
import { getArticleTitleFromUrl } from "@src/utils/extract-article";

export async function getTitleFromUrl(url, taskType) {
  if (taskType === "text-to-speech") {
    return getArticleTitleFromUrl(url);
  }

  if (taskType === "yt-dlp") {
    const metadata = await getContentMetadata(url);
    if (metadata.uploader) {
      return `${metadata.title} - ${metadata.uploader}`;
    } else {
      return metadata.title;
    }
  }
}

export async function inferTaskTypeFromUrl(url) {
  const isSupportedByYtDlp = await checkIfUrlIsSupported(url);
  if (isSupportedByYtDlp) {
    console.log("URL is supported by yt-dlp");
    return "yt-dlp";
  } else {
    console.log("URL is not supported, so using text-to-speech");
    return "text-to-speech";
  }
}

export async function createArticle({
  suppliedTitle,
  suppliedTaskType,
  url,
  shouldGenerateAudio,
  shouldAddRelatedLinks,
}) {
  const requiredFields = [url, suppliedTaskType];
  if (requiredFields.some((field) => !field)) {
    throw new Error("Missing required fields for creating article");
  }

  const taskType =
    suppliedTaskType === "auto"
      ? await inferTaskTypeFromUrl(url)
      : suppliedTaskType;

  const title = suppliedTitle || (await getTitleFromUrl(url, taskType));

  const createdArticleId = createArticleInDb({
    title,
    url,
  });

  const taskNameForType = {
    "text-to-speech": "extractTextFromUrl",
    "yt-dlp": "ytDlp",
  };

  const taskName = taskNameForType[taskType];

  if (!taskName) {
    throw new Error(`Invalid type: ${taskType}`);
  }

  taskQueue.add(taskName, {
    articleId: createdArticleId,
    shouldGenerateAudio,
    shouldAddRelatedLinks,
  });

  return createdArticleId;
}
