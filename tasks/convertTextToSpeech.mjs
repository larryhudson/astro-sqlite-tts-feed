import { getArticleFromDb, updateArticleInDb } from "../src/utils/db.js";
import { getChaptersFromMarkdownContent } from "../src/utils/extract-article.js";
import { getAudioForChapters } from "../src/utils/azure-tts.js";
import { getAudioDurationInSeconds } from "get-audio-duration";
import md5 from "js-md5";
import path from "node:path";
import fs from "node:fs";
import { secsToMMSS } from "../src/utils/time.js";
import "dotenv/config";
import NodeID3 from "node-id3";

export async function convertTextToSpeech({ articleId }) {
  const articleData = getArticleFromDb(articleId);
  const markdownContent = articleData.text_content;

  const existingMp3Url = articleData.mp3Url;

  if (existingMp3Url) {
    console.log("Article already has mp3Url, deleting existing file");
    const mp3FilePath = existingMp3Url.slice(1);

    const mp3PathExists = fs.existsSync(mp3FilePath);
    if (mp3PathExists) {
      // delete the file
      fs.unlinkSync(mp3FilePath);
      console.log(`Deleted mp3 file at ${mp3FilePath}`);
    } else {
      console.log(`No mp3 file found at ${mp3FilePath}`);
    }
  }

  const articleChapters = getChaptersFromMarkdownContent(markdownContent);

  const chaptersWithAudio = await getAudioForChapters(articleChapters);

  const articleHash = md5(markdownContent);
  const articlePath = path.join("static", "articles", `${articleHash}.mp3`);

  console.log(articlePath);

  const articlesFolderPath = path.join("static", "articles");

  const articlesFolderExists = fs.existsSync(articlesFolderPath);
  if (!articlesFolderExists) {
    await fs.promises.mkdir(articlesFolderPath, { recursive: true });
  }

  const mp3Buffers = chaptersWithAudio.map((c) => c.audioBuffer);
  const joinedBuffer = Buffer.concat(mp3Buffers);

  function addChaptersToAudioBuffer(audioBuffer, chapters) {
    const chapterTags = [];
    let currentOffset = 0;

    chapters.forEach((chapter, chapterIndex) => {
      const { title, durationMs } = chapter;
      chapterTags.push({
        elementID: `chapter_${chapterIndex}`,
        startTimeMs: currentOffset,
        endTimeMs: currentOffset + durationMs,
        tags: {
          title,
        },
      });

      currentOffset += chapter.durationMs;
    });

    const id3Tags = {
      chapter: chapterTags,
    };

    const audioBufferWithMetadata = NodeID3.write(id3Tags, audioBuffer);

    return audioBufferWithMetadata;
  }

  const bufferWithMetadata = addChaptersToAudioBuffer(
    joinedBuffer,
    chaptersWithAudio,
  );

  await fs.promises.writeFile(articlePath, bufferWithMetadata);

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
