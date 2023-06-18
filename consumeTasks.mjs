import { Worker } from 'bullmq';
import { createArticle } from "./tasks/createArticle.mjs";

const worker = new Worker('createArticle', async job => {
  if (job.name === 'createArticle') {
    await createArticle(job.data);
  }
});

worker.on('active', job => {
  console.log(`${job.id} has started!`);
})

worker.on('completed', job => {
  console.log(`${job.id} has completed!`);
});

worker.on('failed', (job, err) => {
  console.log(`${job.id} has failed with ${err.message}`);
});

