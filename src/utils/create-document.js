export async function createDocument(file, userId) {
  // check file is allowed file type
  const filename = file.name;
  const documentTitle = path.basename(filename, path.extname(filename));

  const filetype = path.extname(filename).slice(1);
  const allowedFileTypes = ["epub"];
  const isAllowedFiletype = allowedFileTypes.includes(filetype);
  if (!isAllowedFiletype) {
    throw new Error("File type", filetype, "not allowed");
  }

  // TODO: check file is not over maximum file size

  // upload the file to the uploads directory
  const filepath = await uploadFile(file);

  const createdDocumentId = createRecord("documents", {
    title: documentTitle,
    filename,
    filepath,
    document_type: filetype,
    user_id: userId,
  });

  const bullMqJob = await taskQueue.add("extractChaptersFromDocument", {
    documentId: createdDocumentId,
  });

  updateRecord("documents", createdDocumentId, { bullmq_job_id: bullMqJob.id });
}
