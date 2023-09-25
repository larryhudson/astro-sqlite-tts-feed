import { Worker } from "bullmq";
import { textToSpeech } from "./tasks/textToSpeech.mjs";
import { ytDlp } from "./tasks/ytDlp.mjs";

const worker = new Worker(
  "taskQueue",
  async (job) => {
    if (job.name === "textToSpeech") {
      await textToSpeech(job.data);
    }

    if (job.name === "ytDlp") {
      await ytDlp(job.data);
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
  console.log(`${job.id} has failed with ${err.message}`);
});
