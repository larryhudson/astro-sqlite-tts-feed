import { spawn } from "child_process";
import path from "path";

export async function getDownloadFilename(webpageUrl) {
  return new Promise((resolve, reject) => {
    const dataChunks = [];

    const ytDlpProcess = spawn("yt-dlp", [
      "--get-filename",
      webpageUrl,
      "--restrict-filenames",
    ]);

    ytDlpProcess.stdout.on("data", (data) => {
      dataChunks.push(data);
    });

    ytDlpProcess.stderr.on("data", (data) => {
      console.error(`stderr: ${data}`);
    });

    ytDlpProcess.on("exit", (code) => {
      if (code !== 0) {
        reject(new Error(`yt-dlp exited with code ${code}`));
        return;
      }

      const output = Buffer.concat(dataChunks).toString().trim();
      const sanitizedFilename = processFilename(output);
      resolve(sanitizedFilename);
    });
  });
}

export async function getContentMetadata(webpageUrl) {
  return new Promise((resolve, reject) => {
    const dataChunks = [];

    const ytDlpProcess = spawn("yt-dlp", [webpageUrl, "--dump-single-json"]);

    ytDlpProcess.stdout.on("data", (data) => {
      dataChunks.push(data);
    });

    ytDlpProcess.stderr.on("data", (data) => {
      console.error(`stderr: ${data}`);
    });

    ytDlpProcess.on("exit", (code) => {
      if (code !== 0) {
        reject(new Error(`yt-dlp exited with code ${code}`));
        return;
      }

      const output = Buffer.concat(dataChunks).toString().trim();
      const dataObj = JSON.parse(output);
      resolve(dataObj);
    });
  });
}

export async function checkIfUrlIsSupported(webpageUrl) {
  return new Promise((resolve, reject) => {
    const dataChunks = [];

    const ytDlpProcess = spawn("yt-dlp", [webpageUrl, "--dump-single-json"]);

    ytDlpProcess.stdout.on("data", (data) => {
      dataChunks.push(data);
    });

    ytDlpProcess.stderr.on("data", (data) => {
      console.error(`stderr: ${data}`);
      resolve(false);
    });

    ytDlpProcess.on("exit", (code) => {
      if (code !== 0) {
        resolve(false);
      }

      resolve(true);
    });
  });
}

function processFilename(filename) {
  const baseName = path.basename(filename, path.extname(filename));
  return `${baseName}.mp3`;
}

export async function downloadMp3FromWebpage({
  webpageUrl,
  absoluteOutputFilePath,
}) {
  return new Promise((resolve, reject) => {
    const child = spawn("yt-dlp", [
      "--extract-audio",
      "--audio-format",
      "mp3",
      "-o",
      absoluteOutputFilePath,
      webpageUrl,
    ]);

    child.stdout.on("data", (data) => {
      console.log(`stdout: ${data}`);
    });

    child.stderr.on("data", (data) => {
      console.error(`stderr: ${data}`);
    });

    child.on("close", (code) => {
      console.log(`child process exited with code ${code}`);
      resolve(true);
    });
  });
}
