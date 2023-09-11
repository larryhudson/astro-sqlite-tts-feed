import {
  createArticleInDb,
  getArticleFromDb,
  updateArticleInDb,
} from "../src/utils/db.js";
import { extractArticle } from "../src/utils/extract-article.js";
import { getAudioBufferForText } from "../src/utils/azure-tts.js";
import { getAudioDurationInSeconds } from "get-audio-duration";
import md5 from "js-md5";
import path from "node:path";
import fs from "node:fs";
import { secsToMMSS } from "../src/utils/time.js";
import "dotenv/config";

export async function createArticle({ articleId }) {
  console.log("Should be creating an article now");
  // TODO: read data from the database here
  const articleData = getArticleFromDb(articleId);

  const articleContent = await extractArticle(articleData.url);
  const articleAudio = await getAudioBufferForText(articleContent);
  const articleHash = md5(articleContent);
  const articlePath = path.join("static", "articles", `${articleHash}.mp3`);

  console.log(articlePath);

  const articlesFolderPath = path.join("static", "articles");

  const articlesFolderExists = fs.existsSync(articlesFolderPath);
  if (!articlesFolderExists) {
    await fs.promises.mkdir(articlesFolderPath, { recursive: true });
  }

  await fs.promises.writeFile(articlePath, articleAudio);

  console.log("Wrote the file to the path");

  const durationSecs = await getAudioDurationInSeconds(articlePath);

  const mp3Duration = secsToMMSS(durationSecs);

  console.log({ durationSecs, mp3Duration });

  const mp3FileStats = await fs.promises.stat(articlePath);

  console.log({ mp3FileStats });

  const mp3Length = mp3FileStats.size;

  console.log({ mp3Length });

  const articleInDb = updateArticleInDb(articleId, {
    mp3Url: `/static/articles/${articleHash}.mp3`,
    mp3Duration,
    mp3Length,
  });

  return articleInDb;
}
