import { encode } from "html-entities";
import pMap from "p-map";
import { Buffer } from "buffer";

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

  const AZURE_API_KEY = import.meta.env.PUBLIC_AZURE_API_KEY;
  const AZURE_REGION = import.meta.env.PUBLIC_AZURE_REGION;

  const voiceName = "en-AU-WilliamNeural";
  const ttsLang = "en-AU";

  const ttsUrl = `https://${AZURE_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`;

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

  const arrayBuffer = await response.arrayBuffer();

  return Buffer.from(arrayBuffer);
}

export async function getAudioBufferForText(text) {
  console.log(text);
  const chunks = splitTextIntoChunksByLines(text, 3000);

  const result = await pMap(chunks, getAudioBufferForChunk, { concurrency: 2 });
  // use p-map with concurrency of 2
  const audioBuffers = await Promise.all(
    chunks.map((chunk) => getAudioBufferForChunk(chunk))
  );

  return Buffer.concat(audioBuffers);
}
