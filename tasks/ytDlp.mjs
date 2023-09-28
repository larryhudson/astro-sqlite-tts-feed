import {
  createArticleInDb,
  getArticleFromDb,
  updateArticleInDb,
} from "../src/utils/db.js";
import { getAudioDurationInSeconds } from "get-audio-duration";
import md5 from "js-md5";
import path from "node:path";
import fs from "node:fs";
import { secsToMMSS } from "../src/utils/time.js";
import "dotenv/config";
import NodeID3 from "node-id3";
import { spawn } from "child_process";
import {
  getDownloadFilename,
  downloadMp3FromWebpage,
} from "../src/utils/yt-dlp.js";

export async function ytDlp({ articleId }) {
  // TODO: it's not really an article. rename database?

  const articleData = getArticleFromDb(articleId);

  const webpageUrl = articleData.url;

  const downloadFilename = await getDownloadFilename(webpageUrl);

  console.log({ downloadFilename });

  const articlesFolderPath = path.join("static", "articles");

  const articlesFolderExists = fs.existsSync(articlesFolderPath);
  if (!articlesFolderExists) {
    await fs.promises.mkdir(articlesFolderPath, { recursive: true });
  }

  const outputFilePath = path.join(articlesFolderPath, downloadFilename);
  console.log({ outputFilePath });

  const absoluteOutputFilePath = path.resolve(outputFilePath);

  console.log({ absoluteOutputFilePath });

  await downloadMp3FromWebpage({
    webpageUrl,
    absoluteOutputFilePath,
  });

  const durationSecs = await getAudioDurationInSeconds(absoluteOutputFilePath);

  const mp3Duration = secsToMMSS(durationSecs);

  console.log({ durationSecs, mp3Duration });

  const mp3FileStats = await fs.promises.stat(absoluteOutputFilePath);

  console.log({ mp3FileStats });

  const mp3Length = mp3FileStats.size;

  console.log({ mp3Length });

  const articleInDb = updateArticleInDb(articleId, {
    mp3Url: `/static/articles/${downloadFilename}`,
    mp3Duration,
    mp3Length,
  });

  return articleInDb;
}
