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

async function getDownloadFilename(webpageUrl) {
  return new Promise((resolve, reject) => {
    const dataChunks = [];

    const ytDlpProcess = spawn("yt-dlp", [
      "--get-filename",
      webpageUrl,
      "--restrict-filenames",
    ]);

    ytDlpProcess.stdout.on("data", (data) => {
      dataChunks.push(data);
    });

    ytDlpProcess.stderr.on("data", (data) => {
      console.error(`stderr: ${data}`);
    });

    ytDlpProcess.on("exit", (code) => {
      if (code !== 0) {
        reject(new Error(`yt-dlp exited with code ${code}`));
        return;
      }

      const output = Buffer.concat(dataChunks).toString().trim();
      const sanitizedFilename = processFilename(output);
      resolve(sanitizedFilename);
    });
  });
}

function processFilename(filename) {
  const baseName = path.basename(filename, path.extname(filename));
  return `${baseName}.mp3`;
}

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

  // TODO: download with yt-dlp. extract audio. spawn a child process to do this.
  await new Promise((resolve, reject) => {
    const child = spawn("yt-dlp", [
      "--extract-audio",
      "--audio-format",
      "mp3",
      "-o",
      absoluteOutputFilePath,
      webpageUrl,
    ]);

    child.stdout.on("data", (data) => {
      console.log(`stdout: ${data}`);
    });

    child.stderr.on("data", (data) => {
      console.error(`stderr: ${data}`);
    });

    child.on("close", (code) => {
      console.log(`child process exited with code ${code}`);
      resolve(true);
    });
  });

  const durationSecs = await getAudioDurationInSeconds(absoluteOutputFilePath);

  const mp3Duration = secsToMMSS(durationSecs);

  console.log({ durationSecs, mp3Duration });

  const mp3FileStats = await fs.promises.stat(absoluteOutputFilePath);

  console.log({ mp3FileStats });

  const mp3Length = mp3FileStats.size;

  console.log({ mp3Length });

  // TODO: something going wrong with the actual output path

  const articleInDb = updateArticleInDb(articleId, {
    mp3Url: `/static/articles/${downloadFilename}`,
    mp3Duration,
    mp3Length,
  });

  return articleInDb;
}
