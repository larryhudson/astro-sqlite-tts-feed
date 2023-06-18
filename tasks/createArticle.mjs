import { createArticleInDb } from "../src/utils/db.js";
import { extractArticle } from "../src/utils/extract-article.js";
import { getAudioBufferForText } from "../src/utils/azure-tts.js";
import { getAudioDurationInSeconds } from "get-audio-duration";
import md5 from "js-md5";
import path from "node:path";
import fs from "node:fs/promises";
import { secsToMMSS } from "../src/utils/time.js";
import "dotenv/config";

export async function createArticle({url, title}) {

  const articleContent = await extractArticle(url);
  const articleAudio = await getAudioBufferForText(articleContent);
  const articleHash = md5(articleContent);
  const articlePath = path.join("public", "articles", `${articleHash}.mp3`);

  console.log(articlePath);

  const articlesFolderPath = path.join("public", "articles");

  // Check articles folder exists. If it doesn't, create it.
  try {
    const articlesFolderExists = await fs.access(articlesFolderPath);
  }  catch (err) {
    await fs.mkdir(articlesFolderPath, {recursive: true});
  }

  await fs.writeFile(articlePath, articleAudio);

  console.log("Wrote the file to the path");

  const durationSecs = await getAudioDurationInSeconds(articlePath);

  const mp3Duration = secsToMMSS(durationSecs);

  console.log({durationSecs, mp3Duration});

  const mp3FileStats = await fs.stat(articlePath);

  console.log({mp3FileStats});

  const mp3Length = mp3FileStats.size;

  console.log({mp3Length})

  const articleInDb = createArticleInDb({
    title,
    url,
    mp3Url: `/articles/${articleHash}.mp3`,
    mp3Duration,
    mp3Length
  });

return articleInDb;
}
