import pMap from "p-map";
import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";
import cheerio from "cheerio";
import { convert } from "html-to-text";
import glob from "fast-glob";

async function unzipFileToDirectory(zipFilePath, destinationFolder) {
  const zip = new AdmZip(zipFilePath);

  zip.extractAllTo(destinationFolder);
}

async function findFileInDirectory(directory, filename) {
  const files = await glob(`${directory}/**/${filename}`);
  return files[0];
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

    async function getEpubChapters(tempDirectory) {
      const contentsFilePath = await findFileInDirectory(
        tempDirectory,
        "toc.ncx",
      );

      const contentsFileDirectory = path.dirname(contentsFilePath);

      const contentsFileContent = await fs.promises.readFile(
        contentsFilePath,
        "utf8",
      );

      const $ = cheerio.load(contentsFileContent, {
        xmlMode: true,
      });

      return $("navPoint")
        .map((index, element) => {
          const title = $(element).find("navLabel > text").text().trim();
          const htmlSrc = $(element).find("content").attr("src").split("#")[0]; // strip off id
          const htmlPath = path.join(contentsFileDirectory, htmlSrc);

          return {
            title,
            htmlPath,
          };
        })
        .get();
    }

    const chapters = await getEpubChapters(tempDirectory);

    async function getTextForChapter(chapter) {
      const { title, htmlPath } = chapter;

      const htmlContent = await fs.promises.readFile(htmlPath, "utf8");
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
        title,
        text_content: plainText,
      };
    }

    const chaptersWithText = await pMap(chapters, getTextForChapter, {
      concurrency: 2,
    });
    console.log("chapters inside epub function");
    console.log(chaptersWithText);

    fs.rmdirSync(tempDirectory, { recursive: true });

    return chaptersWithText;
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
