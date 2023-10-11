import pMap from "p-map";
import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";
import cheerio from "cheerio";
import { convert } from "html-to-text";
import glob from "fast-glob";

async function findHTMLFiles(directory) {
  const filePatterns = ["**/*.html", "**/*.xhtml"];
  const options = {
    cwd: directory,
    absolute: true,
    onlyFiles: true,
  };

  const htmlFiles = await glob(filePatterns, options);
  return htmlFiles;
}

async function unzipFileToDirectory(zipFilePath, destinationFolder) {
  const zip = new AdmZip(zipFilePath);

  zip.extractAllTo(destinationFolder);
}

async function extractChaptersFromEpub(epubFilePath) {
  try {
    const tempDirectory = "./epub_temp";

    if (!fs.existsSync(tempDirectory)) {
      fs.mkdirSync(tempDirectory);
    }

    const epubFilename = path.basename(epubFilePath);
    const epubTxtDirectory = path.resolve(epubFilename + "_txt");

    const epubTxtDirectoryExists = fs.existsSync(epubTxtDirectory);
    if (epubTxtDirectoryExists) {
      fs.rmdirSync(epubTxtDirectory, { recursive: true });
    }

    await fs.promises.mkdir(epubTxtDirectory);

    await unzipFileToDirectory(epubFilePath, tempDirectory);

    const htmlFiles = await findHTMLFiles(tempDirectory);

    async function handleHtmlPath(htmlFilePath) {
      const htmlFilename = path.basename(
        htmlFilePath,
        path.extname(htmlFilePath),
      );
      const htmlContent = await fs.promises.readFile(htmlFilePath, "utf8");
      // process the html with cheerio
      const $ = cheerio.load(htmlContent);
      const selectorsToRemove = ["sup", "img", "figure"];

      selectorsToRemove.forEach((selector) => {
        $(selector).remove();
      });

      const processedHtml = $.html();

      const plainText = convert(processedHtml, {
        wordwrap: 0,
        selectors: [
          { selector: "a", options: { ignoreHref: true } },
          {
            selector: "h1",
            options: { uppercase: false, prefix: "Heading" },
          },
          {
            selector: "h2",
            options: { uppercase: false, prefix: "Heading" },
          },
          {
            selector: "h3",
            options: { uppercase: false, prefix: "Heading" },
          },
          {
            selector: "h4",
            options: { uppercase: false, prefix: "Heading" },
          },
          { selector: "img", format: "skip" },
        ],
      });

      return {
        text_content: plainText,
        title: htmlFilename,
      };
    }

    const chapters = await pMap(htmlFiles, handleHtmlPath, { concurrency: 2 });
    console.log("chapters inside epub function");
    console.log(chapters);

    // fs.rmdirSync(tempDirectory, { recursive: true });

    return chapters;
  } catch (error) {
    console.error("Error extracting text from EPUB:", error);
    return [];
  }
}

export async function extractChaptersFromDoc(documentPath) {
  const fileType = path.extname(documentPath).slice(1);

  const extractorByFileType = {
    epub: extractChaptersFromEpub,
  };

  const extractorFunction = extractorByFileType[fileType];

  if (!extractorFunction) {
    throw new Error("No handler for file type", fileType);
  }

  const chapters = await extractorFunction(documentPath);
  return chapters;
}
