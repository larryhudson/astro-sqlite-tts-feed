import {
  createArticleInDb,
  getArticleFromDb,
  updateArticleInDb,
} from "../src/utils/db.js";
import { extractArticle } from "../src/utils/extract-article.js";
import { getAudioForChapters } from "../src/utils/azure-tts.js";
import { getAudioDurationInSeconds } from "get-audio-duration";
import md5 from "js-md5";
import path from "node:path";
import fs from "node:fs";
import { secsToMMSS } from "../src/utils/time.js";
import "dotenv/config";
import NodeID3 from "node-id3";

export async function textToSpeech({ articleId }) {
  const articleData = getArticleFromDb(articleId);

  // TODO: instead of returning text here, return an array of chapters
  // each chapter would have a title and text
  const articleChapters = await extractArticle(articleData.url);

  // TODO: change this to handle multiple chapters. for each chapter,
  // get an audio buffer and get the duration of each.
  // so this will be an array of chapter objects.
  const chaptersWithAudio = await getAudioForChapters(articleChapters);

  // TODO: once we have an array of chapter objects, we will need to
  // go through them and set the start and end times
  // so that we can encode that in the ID3 tags of the MP3.

  const allArticleText = chaptersWithAudio.map((c) => c.text).join("\n");
  const articleHash = md5(allArticleText);
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
    chaptersWithAudio
  );

  await fs.promises.writeFile(articlePath, bufferWithMetadata);

  // TODO: after writing the MP3 file, add the ID3 tags?
  // or maybe we can do that before we write the MP3 (eg when it is a buffer)

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
