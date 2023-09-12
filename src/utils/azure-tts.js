import { encode } from "html-entities";
import pMap from "p-map";
import { Buffer } from "buffer";
import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import { secsToMs } from "../utils/time.js";
import { getAudioDurationInSeconds } from "get-audio-duration";
import md5 from "js-md5";

function splitTextIntoChunksByLines(text, chunkLength) {
  const lines = text.split("\n");
  const chunks = [];
  let currentChunk = "";
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (currentChunk.length + line.length > chunkLength) {
      chunks.push(currentChunk);
      currentChunk = "";
    }
    currentChunk += line + "\n";
  }
  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }
  return chunks;
}

async function getAudioBufferForChunk(text) {
  console.log("getting audio for text");
  console.log(text);

  const AZURE_API_KEY = process.env.AZURE_API_KEY;
  const AZURE_API_REGION = process.env.AZURE_API_REGION;

  const voiceName = "en-AU-WilliamNeural";
  const ttsLang = "en-AU";

  const ttsUrl = `https://${AZURE_API_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`;

  const response = await fetch(ttsUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/ssml+xml",
      "X-Microsoft-OutputFormat": "audio-16khz-64kbitrate-mono-mp3",
      "User-Agent": "astro",
      "Ocp-Apim-Subscription-Key": AZURE_API_KEY,
    },
    body: `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${ttsLang}"><voice name="${voiceName}">${encode(
      text
    )}</voice></speak>`,
  });

  if (!response.ok) {
    throw new Error(
      `Error fetching audio from Azure TTS: ${response.status} ${response.statusText}`
    );
  }

  const arrayBuffer = await response.arrayBuffer();

  return Buffer.from(arrayBuffer);
}

export async function getAudioBufferForText(text) {
  console.log(text);
  const chunks = splitTextIntoChunksByLines(text, 3000);

  const audioBuffers = await pMap(chunks, getAudioBufferForChunk, {
    concurrency: 2,
  });
  // use p-map with concurrency of 2

  const joinedBuffer = Buffer.concat(audioBuffers);

  const textHash = md5(text);

  // write the joined buffer to a temporary audio file

  const tmpFolderPath = "./tmp-audio";

  const tmpFolderExists = await fs.existsSync(tmpFolderPath);
  if (!tmpFolderExists) {
    await fsPromises.mkdir(tmpFolderPath, { recursive: true });
  }

  const tmpAudioPath = path.join(tmpFolderPath, `${textHash}.mp3`);

  await fsPromises.writeFile(tmpAudioPath, joinedBuffer);

  const durationSecs = await getAudioDurationInSeconds(tmpAudioPath);
  const durationMs = secsToMs(durationSecs);

  await fsPromises.rm(tmpAudioPath);

  return {
    audioBuffer: joinedBuffer,
    durationMs,
  };
}

export async function getAudioForChapters(chapters) {
  const chaptersWithAudio = await pMap(
    chapters,
    async (chapter) => {
      const chapterText = chapter.text;
      const { audioBuffer, durationMs } = await getAudioBufferForText(
        chapterText
      );

      return {
        ...chapter,
        audioBuffer,
        durationMs,
      };
    },
    {
      concurrency: 1,
    }
  );

  return chaptersWithAudio;
}
