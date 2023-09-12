import { getAudioForChapters } from "./src/utils/azure-tts.js";
import { extractArticle } from "./src/utils/extract-article.js";
import dotenv from "dotenv";
dotenv.config();
// test getting article from wikipedia

const TEST_WIKIPEDIA_URL =
  "https://en.wikipedia.org/wiki/Late_Night_with_Conan_O%27Brien";

async function main() {
  const chapters = await extractArticle(TEST_WIKIPEDIA_URL);

  const chaptersWithAudio = await getAudioForChapters(chapters);

  console.log(chaptersWithAudio);
}

main();
