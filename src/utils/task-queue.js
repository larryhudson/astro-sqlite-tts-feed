import { Queue } from "bullmq";

const taskQueue = new Queue("taskQueue", {
  connection: { host: "127.0.0.1", port: 6379 },
});

export default taskQueue;
