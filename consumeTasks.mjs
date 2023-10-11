import { Worker } from "bullmq";
import { extractTextFromUrl } from "./tasks/extractTextFromUrl.mjs";
import { convertTextToSpeech } from "./tasks/convertTextToSpeech.mjs";
import { ytDlp } from "./tasks/ytDlp.mjs";
import { extractChaptersFromDocument } from "./tasks/extractChaptersFromDocument.mjs";

const worker = new Worker(
  "taskQueue",
  async (job) => {
    if (job.name === "extractTextFromUrl") {
      await extractTextFromUrl(job.data);
    }

    if (job.name === "convertTextToSpeech") {
      await convertTextToSpeech(job.data);
    }

    if (job.name === "ytDlp") {
      await ytDlp(job.data);
    }

    if (job.name === "extractChaptersFromDocument") {
      await extractChaptersFromDocument(job.data);
    }
  },
  { connection: { host: "127.0.0.1", port: 6379 } },
);

worker.on("active", (job) => {
  console.log(`${job.id} has started!`);
});

worker.on("completed", (job) => {
  console.log(`${job.id} has completed!`);
});

worker.on("failed", (job, err) => {
  console.log(err);
  console.log(`${job.id} has failed with ${err.message}`);
});
