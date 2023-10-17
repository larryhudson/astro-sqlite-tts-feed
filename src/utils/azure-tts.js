import { encode } from "html-entities";
import pMap from "p-map";
import { Buffer } from "buffer";
import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import { secsToMs } from "../utils/time.js";
import { getAudioDurationInSeconds } from "get-audio-duration";
import md5 from "js-md5";
import sdk from "microsoft-cognitiveservices-speech-sdk";

export function getCostEstimate(numChars) {
  const AUD_PER_CHARACTER = 0.000024241;
  const costUnrounded = numChars * AUD_PER_CHARACTER;
  const costRounded = Math.round(costUnrounded * 100) / 100;
  return costRounded;
}

export function getCostEstimateForText(text) {
  if (!text) return 0;
  const numChars = text.length;
  return getCostEstimate(numChars);
}

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

export async function getAudioBufferForText(text) {
  console.log(text);
  const chunks = splitTextIntoChunksByLines(text, 3000);

  const dataForChunks = await pMap(chunks, convertTextChunkToSpeech, {
    concurrency: 2,
  });
  // use p-map with concurrency of 2
  //
  const audioBuffers = dataForChunks.map((data) => data.audioBuffer);

  const timingsForEachChunk = dataForChunks.map((data) => data.timings);
  const combinedTimings = combineTimings(timingsForEachChunk);

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
    timings: combinedTimings,
    audioBuffer: joinedBuffer,
    durationMs,
  };
}

export async function getAudioForChapters(chapters) {
  const chaptersWithAudio = await pMap(
    chapters,
    async (chapter) => {
      const chapterText = chapter.text;
      const { audioBuffer, durationMs, timings } =
        await getAudioBufferForText(chapterText);

      return {
        ...chapter,
        audioBuffer,
        timings,
        durationMs,
      };
    },
    {
      concurrency: 1,
    },
  );

  const chapterTimings = chaptersWithAudio.map((c) => c.timings);
  const combinedTimings = combineTimings(chapterTimings);

  return { chaptersWithAudio, combinedTimings };
}

function combineTimings(chunksOfTimings) {
  const combinedTimings = [];
  let offset = 0;

  chunksOfTimings.forEach((currentChunk, chunkIndex) => {
    currentChunk.forEach((timing) => {
      timing.startTime += offset;
      timing.endTime += offset;

      combinedTimings.push(timing);
    });

    if (currentChunk.length > 0) {
      offset += currentChunk[currentChunk.length - 1].endTime;
    }
  });

  return combinedTimings;
}

async function convertTextChunkToSpeech(text) {
  const textHash = md5(text);

  const AZURE_API_KEY = process.env.AZURE_API_KEY;
  const AZURE_API_REGION = process.env.AZURE_API_REGION;

  if (!AZURE_API_KEY) {
    throw new Error(
      "AZURE_API_KEY environment variable is required to use Azure TTS",
    );
  }

  if (!AZURE_API_REGION) {
    throw new Error(
      "AZURE_API_REGION environment variable is required to use Azure TTS",
    );
  }

  const speechConfig = sdk.SpeechConfig.fromSubscription(
    AZURE_API_KEY,
    AZURE_API_REGION,
  );

  const voiceName = "en-AU-WilliamNeural";
  const ttsLang = "en-AU";

  speechConfig.speechSynthesisLanguage = ttsLang;
  speechConfig.speechSynthesisVoiceName = voiceName;
  speechConfig.speechSynthesisOutputFormat =
    sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;

  const TMP_FOLDER_NAME = `.tmp-azure-text-to-speech`;

  if (!fs.existsSync(TMP_FOLDER_NAME)) {
    fs.mkdirSync(TMP_FOLDER_NAME);
  }

  const tmpFilePath = path.join(TMP_FOLDER_NAME, `${textHash}.mp3`);

  const audioConfig = sdk.AudioConfig.fromAudioFileOutput(tmpFilePath);

  const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);

  let timings = [];

  synthesizer.wordBoundary = (_, event) => {
    const startTime = event.privAudioOffset * 0.0000001;
    const startTimeRounded = parseFloat(startTime.toFixed(4));
    const endTime = (event.privAudioOffset + event.privDuration) * 0.0000001;
    const endTimeRounded = parseFloat(endTime.toFixed(4));

    timings.push({
      startTime: startTimeRounded,
      endTime: endTimeRounded,
      text: event.privText.trim(), // trim the text in case it starts with a space (that will trip up when adding spans)
    });
  };

  const audioArrayBuffer = await new Promise((resolve, reject) => {
    const encodedText = encode(text);

    const ssmlText = `<speak xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xmlns:emo="http://www.w3.org/2009/10/emotionml" version="1.0" xml:lang="${ttsLang}">
      <voice name="${voiceName}">
      ${encodedText}
      </voice>
      </speak>`;

    synthesizer.speakSsmlAsync(
      ssmlText,
      async (result) => {
        synthesizer.close();
        if (result.privAudioData) {
          resolve(result.privAudioData);
        } else {
          throw new Error(result.privErrorDetails);
        }
      },
      (error) => {
        console.log(
          `[eleventy-plugin-text-to-speech] Error while generating MP3`,
        );
        synthesizer.close();
        throw new Error(error);
      },
    );
  });

  const audioBuffer = Buffer.from(audioArrayBuffer);

  return {
    audioBuffer,
    timings,
  };
}
