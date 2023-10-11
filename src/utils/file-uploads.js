import fs from "fs";
import path from "path";

function generateRandomString() {
  // TODO: implement this
  return "";
}

export async function uploadFile(formFile) {
  const fileArrayBuffer = await formFile.arrayBuffer();
  const fileBuffer = Buffer.from(fileArrayBuffer);

  const filename = formFile.name;
  const fileExt = path.extname(filename); // this includes a dot
  const filenameWithoutExt = path.basename(filename, path.extname(filename));
  const uploadFilename = filenameWithoutExt + generateRandomString() + fileExt;

  const uploadsFolderName = "uploads";
  const uploadsFolderPath = path.resolve(uploadsFolderName);
  const uploadsFolderExists = fs.existsSync(uploadsFolderPath);

  if (!uploadsFolderExists) {
    fs.mkdirSync(uploadsFolderPath);
  }

  const uploadFilePath = path.join(uploadsFolderPath, uploadFilename);

  await fs.promises.writeFile(uploadFilePath, fileBuffer);

  return uploadFilePath;
}
